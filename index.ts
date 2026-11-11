import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-cleanup-secret",
};

function londonDateMinusSixDays(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const today = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    12,
  ));
  today.setUTCDate(today.getUTCDate() - 6);
  return today.toISOString().slice(0, 10);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const expectedSecret = Deno.env.get("CLEANUP_SECRET");
  const suppliedSecret = request.headers.get("x-cleanup-secret");
  if (!expectedSecret || !suppliedSecret || suppliedSecret !== expectedSecret) {
    return Response.json({ error: "Unauthorised" }, { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase function environment settings" }, { status: 500, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const cutoffDate = londonDateMinusSixDays();
  let deletedCompletions = 0;
  let deletedPhotos = 0;

  try {
    // Remove Storage objects first. If Storage deletion fails, keep the database
    // rows so the cleanup can safely retry on its next scheduled run.
    while (true) {
      const { data: oldRows, error: selectError } = await admin
        .from("activity_completions")
        .select("id, photo_path")
        .lt("completion_date", cutoffDate)
        .order("id", { ascending: true })
        .limit(500);

      if (selectError) throw selectError;
      if (!oldRows?.length) break;

      const paths = [...new Set(oldRows.map((row) => row.photo_path).filter(Boolean))];
      if (paths.length) {
        const { error: storageError } = await admin.storage
          .from("daily-evidence")
          .remove(paths);
        if (storageError) throw storageError;
        deletedPhotos += paths.length;
      }

      const ids = oldRows.map((row) => row.id);
      const { error: deleteError } = await admin
        .from("activity_completions")
        .delete()
        .in("id", ids);
      if (deleteError) throw deleteError;
      deletedCompletions += ids.length;
    }

    const { error: snapshotError, count } = await admin
      .from("daily_routine_snapshots")
      .delete({ count: "exact" })
      .lt("completion_date", cutoffDate);
    if (snapshotError) throw snapshotError;

    return Response.json({
      ok: true,
      cutoffDate,
      deletedCompletions,
      deletedPhotos,
      deletedSnapshots: count ?? null,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Daily Together retention cleanup failed:", error);
    return Response.json({
      ok: false,
      cutoffDate,
      deletedCompletions,
      deletedPhotos,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500, headers: corsHeaders });
  }
});
