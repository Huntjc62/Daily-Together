(() => {
"use strict";

const BUCKET = "daily-evidence";
const $ = id => document.getElementById(id);
window.addEventListener("error", event => {
  console.error("Daily Together JavaScript error:", event.error || event.message);
  const message = $("loginError");
  if (message && !message.textContent) message.textContent = "The app encountered a loading error. Refresh the page and try again.";
});
const cfg = window.DAILY_TOGETHER_SUPABASE || {};
const ready = !!(cfg.url && cfg.publishableKey && !cfg.url.includes("YOUR_PROJECT") &&
  !cfg.publishableKey.includes("YOUR_KEY") && window.supabase?.createClient);
const client = ready ? window.supabase.createClient(cfg.url, cfg.publishableKey) : null;
let currentUser=null, currentRole=null, completions=[], routineSections=[], realtimeChannel=null;

function dateKey(date=new Date()) {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
function dateDaysAgo(days) {
  const [y,m,d]=dateKey().split("-").map(Number);
  const dt=new Date(Date.UTC(y,m-1,d-days,12));
  return dt.toISOString().slice(0,10);
}
function escapeHtml(s="") {
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function setMessage(id,msg) { const el=$(id); if(el) el.textContent=msg; }
function allActivities() {
  return routineSections.flatMap((section,si)=>section.tasks.map((task,ti)=>({
    id:task.id, sectionIndex:si, taskIndex:ti, title:task.title, sectionTitle:section.title
  })));
}
function completionMap() { return new Map(completions.map(c=>[c.activity_id,c])); }

async function loadCurrentProfile() {
  const {data,error}=await client.from("profiles").select("username,role").eq("id",currentUser.id).single();
  if(error) throw error;
  if(!data || !["admin","partner"].includes(data.role)) throw new Error("No valid Daily Together profile is linked to this Supabase account.");
  currentRole=data.role;
  return data;
}
async function login(event) {
  event.preventDefault(); setMessage("loginError","");
  if(!client){setMessage("loginError","Supabase is not configured. Check supabase-config.js.");return;}
  const button=$("loginButton"); button.disabled=true; button.textContent="Signing in…";
  try {
    const {data,error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
    if(error) throw error;
    currentUser=data.user;
    await loadCurrentProfile();
    await enterApp();
  } catch(err) {
    console.error("Sign-in error:",err);
    await client.auth.signOut().catch(()=>{});
    currentUser=null; currentRole=null;
    setMessage("loginError",`Sign-in failed: ${err.message || "Check your Supabase account and profile setup."}`);
  } finally {button.disabled=false;button.textContent="Sign in";}
}
async function loadRoutine() {
  const [{data:sections,error:sectionError},{data:tasks,error:taskError}]=await Promise.all([
    client.from("routine_sections").select("id,time,title,subtitle,sort_order").order("sort_order"),
    client.from("routine_tasks").select("id,section_id,title,sort_order").order("sort_order")
  ]);
  if(sectionError) throw sectionError;
  if(taskError) throw taskError;
  routineSections=(sections||[]).map(s=>({...s,tasks:(tasks||[]).filter(t=>t.section_id===s.id)}));
}
async function ensureDailySnapshot() {
  const {error}=await client.rpc("snapshot_daily_together_routine");
  if(error) throw error;
}
async function loadCompletions() {
  const {data,error}=await client.from("activity_completions")
    .select("id,user_id,activity_id,completion_date,photo_path,completed_at")
    .eq("completion_date",dateKey());
  if(error) throw error;
  completions=data||[];
}
async function enterApp() {
  $("login").classList.add("hidden"); $("site").classList.remove("hidden");
  $("who").textContent=currentRole==="admin"?"Josh · Admin":"Lily";
  $("lilyView").classList.toggle("hidden",currentRole!=="partner");
  $("joshView").classList.toggle("hidden",currentRole!=="admin");
  $("adminNav").classList.toggle("hidden",currentRole!=="admin");
  if(currentRole==="admin") showAdminTab("overview");
  $("headline").textContent=currentRole==="admin"?"Here's how Lily's day is going.":"A calmer day starts here.";
  $("intro").textContent=currentRole==="admin"?"See Lily's progress, manage her routine and review the last seven days.":"A realistic routine built around you and Harper. Take it at your own pace — this is a guide, not a test.";
  $("today").textContent=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  try {
    await loadRoutine();
    if(currentRole==="partner") await ensureDailySnapshot();
    await loadCompletions();
    render();
    if(currentRole==="admin") renderManager();
    subscribeRealtime();
  } catch(err) {
    console.error("Could not load Daily Together:",err);
    await client.auth.signOut().catch(()=>{});
    currentUser=null; currentRole=null;
    $("site").classList.add("hidden"); $("login").classList.remove("hidden");
    setMessage("loginError",`Signed in, but setup is incomplete: ${err.message || "check the updated Supabase SQL has been run."}`);
  }
}
function subscribeRealtime() {
  if(realtimeChannel) client.removeChannel(realtimeChannel);
  realtimeChannel=client.channel("daily-together-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"activity_completions"},async payload=>{
      if(payload.new?.completion_date===dateKey() || payload.old?.completion_date===dateKey()){await loadCompletions();render();}
    })
    .on("postgres_changes",{event:"*",schema:"public",table:"routine_sections"},async()=>{await loadRoutine();if(currentRole==="partner")await ensureDailySnapshot();render();if(currentRole==="admin")renderManager();})
    .on("postgres_changes",{event:"*",schema:"public",table:"routine_tasks"},async()=>{await loadRoutine();if(currentRole==="partner")await ensureDailySnapshot();render();if(currentRole==="admin")renderManager();})
    .subscribe();
}
async function signedPhoto(path) {
  const {data,error}=await client.storage.from(BUCKET).createSignedUrl(path,60*60);
  if(error){console.error("Could not create photo link:",error);return null;}
  return data.signedUrl;
}
async function render() {
  const map=completionMap(),activities=allActivities();
  const done=activities.filter(a=>map.has(a.id)).length;
  const percent=activities.length?Math.round(done/activities.length*100):0;
  $("percent").textContent=percent+"%"; $("bar").style.width=percent+"%";
  $("count").textContent=`${done} of ${activities.length} activities completed`;
  $("finish").classList.toggle("hidden",activities.length===0 || done!==activities.length);
  $("timeline").innerHTML=routineSections.map((s,i)=>stepHtml(s,i,false,map)).join("");
  $("adminTimeline").innerHTML=routineSections.map((s,i)=>stepHtml(s,i,true,map)).join("");
  document.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>openUpload(Number(b.dataset.step))));
  if(currentRole==="admin") {
    $("stats").innerHTML=`<div class="stat"><strong>${done}/${activities.length}</strong><span>Activities completed</span></div><div class="stat"><strong>${activities.length-done}</strong><span>Still outstanding</span></div><div class="stat"><strong>${done}</strong><span>Photo check-ins</span></div>`;
    for(const c of completions) {
      const a=document.querySelector(`[data-photo="${CSS.escape(c.activity_id)}"]`);
      if(a){const url=await signedPhoto(c.photo_path);if(url)a.href=url;}
    }
  }
}
function stepHtml(section,index,admin,map) {
  const ids=section.tasks.map(t=>t.id);
  const done=ids.length>0 && ids.every(id=>map.has(id));
  const any=ids.some(id=>map.has(id));
  const items=section.tasks.map(task=>{
    const c=map.get(task.id);
    const time=c?.completed_at?new Date(c.completed_at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"";
    return `<div class="task-item">${c?"✓ ":"○ "}${escapeHtml(task.title)}${c&&time?` · ${escapeHtml(time)}`:""}${admin&&c?` · <a class="photo-link" data-photo="${escapeHtml(task.id)}" href="#" target="_blank" rel="noopener">View photo</a>`:""}</div>`;
  }).join("");
  const action=admin?`<span class="complete">${done?"Completed ✓":any?"Partially complete":"Not started"}</span>`:
    `<button class="btn ${done?"":"primary"}" data-step="${index}" ${done?"disabled":""}>${done?"Completed ✓":"Add photo check-ins"}</button>`;
  return `<article class="step ${done?"done":""}"><div class="time">${escapeHtml(section.time)}</div><div class="number">${done?"✓":String(index+1).padStart(2,"0")}</div><div><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.subtitle)}</p><div class="task-items">${items}</div></div><div class="step-action">${action}</div></article>`;
}
function openUpload(index) {
  const section=routineSections[index]; if(!section)return;
  const map=completionMap();
  $("modalTitle").textContent=section.time+" · "+section.title;
  $("modalDesc").textContent="Upload a photo for each activity that is not already complete.";
  const pending=section.tasks.filter(task=>!map.has(task.id));
  $("uploadForm").innerHTML=`${pending.map(task=>`<div class="upload-task"><label>${escapeHtml(task.title)}</label><input type="file" accept="image/*" capture="environment" data-activity="${escapeHtml(task.id)}" required><img class="preview hidden" data-preview="${escapeHtml(task.id)}" alt="Photo preview"></div>`).join("")}<p class="error" id="uploadError"></p><button id="savePhoto" class="btn primary wide" type="submit">Upload photos & complete activities</button>`;
  $("uploadDialog").showModal();
  $("uploadForm").querySelectorAll('input[type=file]').forEach(input=>input.addEventListener("change",()=>{
    const file=input.files[0],img=$(`[data-preview="${input.dataset.activity}"]`);
    if(file){img.src=URL.createObjectURL(file);img.classList.remove("hidden");}
  }));
  $("uploadForm").onsubmit=saveStep;
}
async function compressImage(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader(); reader.onerror=reject;
    reader.onload=()=>{
      const img=new Image(); img.onerror=reject; img.onload=()=>{
        const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement("canvas"); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
        canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not process image")),"image/jpeg",.78);
      }; img.src=reader.result;
    }; reader.readAsDataURL(file);
  });
}
async function saveStep(event) {
  event.preventDefault();
  const form=$("uploadForm"),inputs=[...form.querySelectorAll('input[type=file]')],error=form.querySelector(".error"),button=$("savePhoto");
  if(inputs.some(x=>!x.files[0])){error.textContent="Please add a photo for every outstanding activity in this time block.";return;}
  if(inputs.some(x=>x.files[0].size>12*1024*1024)){error.textContent="Please choose photos smaller than 12 MB each.";return;}
  button.disabled=true; button.textContent="Uploading photos…";
  try {
    for(const input of inputs){
      const activity=input.dataset.activity,file=input.files[0],blob=await compressImage(file);
      const path=`${currentUser.id}/${dateKey()}/${activity}/${crypto.randomUUID()}.jpg`;
      const {error:uploadError}=await client.storage.from(BUCKET).upload(path,blob,{contentType:"image/jpeg",upsert:false});
      if(uploadError)throw uploadError;
      const {error:insertError}=await client.from("activity_completions").insert({user_id:currentUser.id,activity_id:activity,completion_date:dateKey(),photo_path:path});
      if(insertError)throw insertError;
    }
    await loadCompletions(); $("uploadDialog").close(); render();
  }catch(err){error.textContent=`Upload failed: ${err.message || "Please check your connection and try again."}`;console.error(err);}
  finally{button.disabled=false;button.textContent="Upload photos & complete activities";}
}

/* Josh's admin task manager */
function renderManager() {
  if(currentRole!=="admin")return;
  const root=$("managerContent");
  root.innerHTML=`
    <div class="manager-intro"><h3>Manage the daily routine</h3><p>Add time slots and activities, or edit and remove existing ones. Changes appear for Lily the next time the routine refreshes.</p></div>
    <form class="admin-form section-add-form" data-form="section-add">
      <h4>Add a new time slot</h4>
      <div class="form-grid"><label>Time<input name="time" placeholder="e.g. 10:30 am" required></label><label>Section title<input name="title" placeholder="e.g. Afternoon walk" required></label><label class="span-all">Description<input name="subtitle" placeholder="Short description"></label></div>
      <button class="btn primary" type="submit">Add time slot</button>
    </form>
    ${routineSections.map((s,i)=>`
      <article class="manage-section">
        <div class="manage-section-top"><span class="manage-order">TIME SLOT ${i+1}</span><div class="move-buttons"><button type="button" class="btn small-btn" data-action="section-move" data-id="${escapeHtml(s.id)}" data-dir="-1" ${i===0?"disabled":""}>↑</button><button type="button" class="btn small-btn" data-action="section-move" data-id="${escapeHtml(s.id)}" data-dir="1" ${i===routineSections.length-1?"disabled":""}>↓</button></div></div>
        <form class="admin-form" data-form="section-update" data-id="${escapeHtml(s.id)}">
          <div class="form-grid"><label>Time<input name="time" value="${escapeHtml(s.time)}" required></label><label>Title<input name="title" value="${escapeHtml(s.title)}" required></label><label class="span-all">Description<input name="subtitle" value="${escapeHtml(s.subtitle)}"></label></div>
          <div class="form-actions"><button class="btn primary" type="submit">Save time slot</button><button class="btn danger" type="button" data-action="section-delete" data-id="${escapeHtml(s.id)}">Delete time slot</button></div>
        </form>
        <div class="manage-tasks"><h4>Activities in this time slot</h4>
          ${s.tasks.map((t,j)=>`
            <form class="task-edit-row" data-form="task-update" data-id="${escapeHtml(t.id)}" data-section="${escapeHtml(s.id)}">
              <span class="task-edit-index">${j+1}</span><input name="title" value="${escapeHtml(t.title)}" aria-label="Activity name" required>
              <button class="btn small-btn" type="button" data-action="task-move" data-id="${escapeHtml(t.id)}" data-dir="-1" ${j===0?"disabled":""}>↑</button>
              <button class="btn small-btn" type="button" data-action="task-move" data-id="${escapeHtml(t.id)}" data-dir="1" ${j===s.tasks.length-1?"disabled":""}>↓</button>
              <button class="btn primary small-btn" type="submit">Save</button>
              <button class="btn danger small-btn" type="button" data-action="task-delete" data-id="${escapeHtml(t.id)}">Delete</button>
            </form>`).join("")}
          <form class="task-add-row" data-form="task-add" data-section="${escapeHtml(s.id)}"><input name="title" placeholder="Add a new activity…" required><button class="btn primary" type="submit">Add activity</button></form>
        </div>
      </article>`).join("")}`;
}
async function refreshRoutineViews() {
  await loadRoutine(); await loadCompletions(); render(); renderManager();
}
async function handleManagerSubmit(event) {
  const form=event.target.closest("form[data-form]"); if(!form)return;
  event.preventDefault();
  const kind=form.dataset.form,fd=new FormData(form),v=Object.fromEntries(fd.entries());
  try {
    if(kind==="section-add"){
      const max=Math.max(-1,...routineSections.map(s=>s.sort_order));
      const id="section-"+crypto.randomUUID();
      const {error}=await client.from("routine_sections").insert({id,time:v.time.trim(),title:v.title.trim(),subtitle:(v.subtitle||"").trim(),sort_order:max+1});
      if(error)throw error;
    }else if(kind==="section-update"){
      const {error}=await client.from("routine_sections").update({time:v.time.trim(),title:v.title.trim(),subtitle:(v.subtitle||"").trim()}).eq("id",form.dataset.id);
      if(error)throw error;
    }else if(kind==="task-add"){
      const section=routineSections.find(s=>s.id===form.dataset.section); if(!section)throw new Error("Time slot not found.");
      const max=Math.max(-1,...section.tasks.map(t=>t.sort_order));
      const {error}=await client.from("routine_tasks").insert({id:"task-"+crypto.randomUUID(),section_id:section.id,title:v.title.trim(),sort_order:max+1});
      if(error)throw error;
    }else if(kind==="task-update"){
      const {error}=await client.from("routine_tasks").update({title:v.title.trim()}).eq("id",form.dataset.id);
      if(error)throw error;
    }
    await refreshRoutineViews();
  }catch(err){alert(`Could not save this change: ${err.message || err}`);console.error(err);}
}
async function moveTask(id,dir) {
  const section=routineSections.find(s=>s.tasks.some(t=>t.id===id)); if(!section)return;
  const tasks=[...section.tasks].sort((a,b)=>a.sort_order-b.sort_order),i=tasks.findIndex(t=>t.id===id),j=i+dir;
  if(j<0||j>=tasks.length)return;
  const a=tasks[i],b=tasks[j];
  const r1=await client.from("routine_tasks").update({sort_order:b.sort_order}).eq("id",a.id); if(r1.error)throw r1.error;
  const r2=await client.from("routine_tasks").update({sort_order:a.sort_order}).eq("id",b.id); if(r2.error)throw r2.error;
  await refreshRoutineViews();
}
async function moveSection(id,dir) {
  const sections=[...routineSections].sort((a,b)=>a.sort_order-b.sort_order),i=sections.findIndex(s=>s.id===id),j=i+dir;
  if(j<0||j>=sections.length)return;
  const a=sections[i],b=sections[j];
  const r1=await client.from("routine_sections").update({sort_order:b.sort_order}).eq("id",a.id); if(r1.error)throw r1.error;
  const r2=await client.from("routine_sections").update({sort_order:a.sort_order}).eq("id",b.id); if(r2.error)throw r2.error;
  await refreshRoutineViews();
}
async function handleManagerClick(event) {
  const button=event.target.closest("button[data-action]"); if(!button)return;
  const {action,id,dir}=button.dataset;
  try {
    if(action==="task-delete"){
      if(!confirm("Delete this activity from the current routine? Its past seven-day history will be kept."))return;
      const {error}=await client.from("routine_tasks").delete().eq("id",id); if(error)throw error;
    }else if(action==="section-delete"){
      if(!confirm("Delete this whole time slot and all its activities? Past seven-day history will be kept."))return;
      const {error}=await client.from("routine_sections").delete().eq("id",id); if(error)throw error;
    }else if(action==="task-move"){await moveTask(id,Number(dir));return;}
    else if(action==="section-move"){await moveSection(id,Number(dir));return;}
    await refreshRoutineViews();
  }catch(err){alert(`Could not complete this change: ${err.message || err}`);console.error(err);}
}

/* Last seven days: expected activities are read from immutable daily snapshots. */
async function renderHistory() {
  const root=$("historyContent");
  root.innerHTML='<p class="sub">Loading the last seven days…</p>';
  try {
    const cutoff=dateDaysAgo(6);
    const [{data:snapshots,error:sErr},{data:rows,error:cErr}]=await Promise.all([
      client.from("daily_routine_snapshots").select("*").gte("completion_date",cutoff).order("completion_date",{ascending:false}).order("section_sort_order").order("task_sort_order"),
      client.from("activity_completions").select("id,activity_id,completion_date,photo_path,completed_at").gte("completion_date",cutoff).order("completed_at")
    ]);
    if(sErr)throw sErr; if(cErr)throw cErr;
    const doneMap=new Map((rows||[]).map(r=>[`${r.completion_date}|${r.activity_id}`,r]));
    const byDate=new Map();
    for(const snap of snapshots||[]){if(!byDate.has(snap.completion_date))byDate.set(snap.completion_date,[]);byDate.get(snap.completion_date).push(snap);}
    const dates=[...byDate.keys()].sort((a,b)=>b.localeCompare(a));
    if(!dates.length){root.innerHTML='<div class="empty-state">No daily history has been collected yet. Lily’s routine is saved as a daily snapshot when she opens the app.</div>';return;}
    const dayHtml=[];
    for(const date of dates){
      const items=byDate.get(date),finished=items.filter(x=>doneMap.has(`${date}|${x.activity_id}`));
      const pct=items.length?Math.round(finished.length/items.length*100):0;
      const dateLabel=new Date(date+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
      const rowsHtml=[];
      for(const item of items){
        const completion=doneMap.get(`${date}|${item.activity_id}`);
        const time=completion?new Date(completion.completed_at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"";
        let photo="";
        if(completion){const url=await signedPhoto(completion.photo_path);if(url)photo=`<a class="photo-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">View photo</a>`;}
        rowsHtml.push(`<div class="history-item ${completion?"is-done":"is-missed"}"><span class="history-status">${completion?"✓":"—"}</span><div><strong>${escapeHtml(item.section_time)} · ${escapeHtml(item.section_title)}</strong><p>${escapeHtml(item.activity_title)}</p></div><div class="history-result">${completion?`${time} · ${photo}`:"Not completed"}</div></div>`);
      }
      dayHtml.push(`<details class="history-day" open><summary><span><strong>${dateLabel}</strong><small>${finished.length} of ${items.length} activities</small></span><span class="history-percent">${pct}%</span></summary><div class="history-meter"><i style="width:${pct}%"></i></div><div class="history-items">${rowsHtml.join("")}</div></details>`);
    }
    root.innerHTML=dayHtml.join("");
  }catch(err){console.error("History load failed:",err);root.innerHTML=`<p class="error">Could not load history: ${escapeHtml(err.message||err)}</p>`;}
}
function showAdminTab(tab) {
  document.querySelectorAll("[data-admin-panel]").forEach(p=>p.classList.toggle("hidden",p.dataset.adminPanel!==tab));
  document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("active",b.dataset.adminTab===tab));
  if(tab==="manage")renderManager();
  if(tab==="history")renderHistory();
}
async function logout() {
  if(realtimeChannel){await client.removeChannel(realtimeChannel);realtimeChannel=null;}
  await client.auth.signOut();currentUser=null;currentRole=null;completions=[];routineSections=[];
  $("site").classList.add("hidden");$("login").classList.remove("hidden");$("password").value="";
}
$("loginForm").addEventListener("submit",login);
$("logout").addEventListener("click",logout);
$("managerContent").addEventListener("submit",handleManagerSubmit);
$("managerContent").addEventListener("click",handleManagerClick);
document.querySelectorAll("[data-admin-tab]").forEach(b=>b.addEventListener("click",()=>showAdminTab(b.dataset.adminTab)));

if(!window.supabase?.createClient) setMessage("loginError","The Supabase sign-in library did not load. Check your internet connection.");
else if(!ready) setMessage("loginError","Supabase connection details are missing. Check supabase-config.js.");
else client.auth.getSession().then(async({data,error})=>{
  if(error){setMessage("loginError",`Could not check your session: ${error.message}`);return;}
  if(data.session){
    try{currentUser=data.session.user;await loadCurrentProfile();await enterApp();}
    catch(err){console.error(err);await client.auth.signOut();currentUser=null;currentRole=null;setMessage("loginError",`This account is not ready for Daily Together: ${err.message||err}`);}
  }
}).catch(err=>setMessage("loginError",`Could not connect to Supabase: ${err.message||err}`));
})();