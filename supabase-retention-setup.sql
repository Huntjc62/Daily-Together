-- DAILY TOGETHER: seven-day automatic retention.
-- Run this AFTER deploying the cleanup-daily-together Edge Function and setting
-- its CLEANUP_SECRET environment variable to the same long random value below.
-- In Supabase, enable pg_cron, pg_net and Vault if they are not already enabled.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'daily_together_project_url'
  ) then
    perform vault.create_secret(
      'https://xrvfahvxzdypqxwxouau.supabase.co',
      'daily_together_project_url'
    );
  end if;

  if not exists (
    select 1 from vault.decrypted_secrets where name = 'daily_together_cleanup_secret'
  ) then
    -- Replace this placeholder with the exact value set as CLEANUP_SECRET
    -- in the Edge Function's secrets before running this script.
    perform vault.create_secret(
      'REPLACE_WITH_YOUR_LONG_RANDOM_CLEANUP_SECRET',
      'daily_together_cleanup_secret'
    );
  end if;
end $$;

-- Schedule once per day at 03:15 UTC. The function uses UK local dates.
select cron.schedule(
  'daily-together-seven-day-cleanup',
  '15 3 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'daily_together_project_url')
              || '/functions/v1/cleanup-daily-together',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_together_cleanup_secret')
      ),
      body := jsonb_build_object('requested_at', now())
    );
  $job$
);
