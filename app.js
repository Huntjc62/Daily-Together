(() => {
"use strict";

// Authentication is handled directly by Supabase Auth.
// User permissions are loaded from the signed-in user's Supabase profile.
const BUCKET = "daily-evidence";
const ROUTINE = [
 {time:"7:00 am",title:"Start the day",subtitle:"Wake up with Harper",tasks:["Have a large glass of water.","Open the curtains and get some daylight."]},
 {time:"7:30 am",title:"Breakfast",subtitle:"Breakfast for you and Harper",tasks:["Make breakfast for yourself and Harper.","Make and drink a cup of tea."]},
 {time:"8:30 am",title:"Get outside",subtitle:"Fresh air with Harper",tasks:["Go for a 15–30-minute buggy walk if practical.","Get some natural daylight.","Don't worry about hitting step targets.","Keep movement gentle and comfortable."]},
 {time:"9:30 am",title:"Harper's morning activities",subtitle:"Playtime and normal activities",tasks:["Play with Harper.","Read books together.","Let her explore age-appropriate toys.","Keep water nearby.","Take breaks when possible."]},
 {time:"10:00 am",title:"Morning snack",subtitle:"A little something to keep you going",tasks:["Have Greek yoghurt.","Add banana or berries.","Add a few nuts if you enjoy them."]},
 {time:"11:00 am",title:"Playtime and activities",subtitle:"A flexible morning with Harper",tasks:["Play with Harper or enjoy an activity together.","Read books or explore age-appropriate toys.","Go out for an errand or visit family if you fancy it.","Keep plans flexible depending on your energy."]},
 {time:"12:00 pm",title:"Lunch",subtitle:"Choose a meal from Josh's acceptable meals list",tasks:["Have a meal from the list of acceptable meals provided by Josh.","Have a glass of water."]},
 {time:"1:00 pm",title:"Harper's nap",subtitle:"Protected rest time — this is not housework time",tasks:["Have a proper sit-down.","Eat something if you're hungry.","Read, watch television or relax.","If exhausted, have a short nap.","Leave the housework for later where possible."]},
 {time:"2:30 pm",title:"Afternoon snack",subtitle:"Keep yourself fuelled",tasks:["Have wholemeal toast with peanut butter, or a banana, or Greek yoghurt."]},
 {time:"3:30 pm",title:"Afternoon play and quiet time",subtitle:"A gentle part of the afternoon with Harper",tasks:["Spend some relaxed time playing with Harper.","Read a book or enjoy a quiet activity together.","Keep things easy and take a break whenever you need one."]},
 {time:"4:30 pm",title:"Time for yourself",subtitle:"Josh is home — enjoy some time to recharge",tasks:["Have a shower, relax, or go for a walk alone.","Catch up with something you enjoy.","Or simply do nothing.","Josh takes over with Harper so you can have this time to yourself."]},
 {time:"5:30 pm",title:"Dinner",subtitle:"Enjoy a balanced evening meal",tasks:["Have a balanced meal.","Have a glass of water."]},
 {time:"6:30 pm",title:"Family time",subtitle:"Enjoy time together as a family",tasks:["Spend relaxed time together with Josh and Harper.","Play together, chat or enjoy a family activity.","Enjoy this time together — no household chores on the list."]},
 {time:"7:30 pm",title:"Lily's rest time",subtitle:"Josh handles Harper's bedtime",tasks:["Put your feet up and relax while Josh handles Harper's bedtime.","Watch something, read or enjoy some quiet time.","You don't need to do any bedtime jobs."]},
 {time:"8:00 pm",title:"Lily & Josh time",subtitle:"An hour together",tasks:["Spend some time talking together.","Watch a film or a favourite programme.","Enjoy some time together without worrying about jobs for tomorrow."]},
 {time:"9:00 pm",title:"Wind down",subtitle:"Start slowing things down for bed",tasks:["Have a shower or bath if you like.","Put phones away if possible.","Avoid caffeine late in the evening.","Get everything ready to settle down for the night."]},
 {time:"9:30 pm",title:"Bed",subtitle:"Prioritise sleep and recovery",tasks:["Be in bed and give yourself the chance to rest."]}
];

const $ = id => document.getElementById(id);
const cfg = window.DAILY_TOGETHER_SUPABASE || {};
const ready = cfg.url && cfg.publishableKey &&
  !cfg.url.includes("YOUR_PROJECT") && !cfg.publishableKey.includes("YOUR_KEY") &&
  window.supabase?.createClient;
const client = ready ? window.supabase.createClient(cfg.url, cfg.publishableKey) : null;
let currentUser = null, currentRole = null, completions = [], realtimeChannel = null, selectedStep = null;

function dateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Europe/London", year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map(p => [p.type,p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
function escapeHtml(s="") {
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function activityId(sectionIndex, taskIndex) { return `s${sectionIndex}-t${taskIndex}`; }
function allActivities() {
  return ROUTINE.flatMap((section,si)=>section.tasks.map((task,ti)=>({
    id:activityId(si,ti), sectionIndex:si, taskIndex:ti, title:task, sectionTitle:section.title
  })));
}
function completionMap() {
  return new Map(completions.map(c=>[c.activity_id,c]));
}
function setMessage(id,msg) { const el=$(id); if(el) el.textContent=msg; }

async function loadCurrentProfile() {
  const { data, error } = await client.from("profiles")
    .select("username, role")
    .eq("id", currentUser.id)
    .single();
  if (error) throw error;
  if (!data || !["admin", "partner"].includes(data.role)) {
    throw new Error("No valid app profile is linked to this Supabase account.");
  }
  currentRole = data.role;
  return data;
}

async function login(event) {
  event.preventDefault();
  setMessage("loginError", "");
  if (!client) {
    setMessage("loginError", "Supabase is not configured. Check the project URL and publishable key.");
    return;
  }
  const email = $("email").value.trim();
  const password = $("password").value;
  const button = $("loginButton");
  button.disabled = true;
  button.textContent = "Signing in…";
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.user;
    await loadCurrentProfile();
    await enterApp();
  } catch (err) {
    console.error("Sign-in error:", err);
    await client.auth.signOut().catch(() => {});
    currentUser = null;
    currentRole = null;
    setMessage("loginError", err.message?.includes("profiles")
      ? "Your Supabase account has no app profile yet. Check that the setup SQL ran successfully and the user ID matches."
      : "Sign-in failed. Check the email address and password for your Supabase Auth account.");
  } finally {
    button.disabled = false;
    button.textContent = "Sign in";
  }
}
async function enterApp() {
  $("login").classList.add("hidden");$("site").classList.remove("hidden");
  $("who").textContent=currentRole==="admin"?"Josh · Admin":"Lily";
  $("lilyView").classList.toggle("hidden",currentRole!=="partner");
  $("joshView").classList.toggle("hidden",currentRole!=="admin");
  $("headline").textContent=currentRole==="admin"?"Here's how Lily's day is going.":"A calmer day starts here.";
  $("intro").textContent=currentRole==="admin"?"See which steps Lily has completed and view her photo check-ins.":"A realistic routine built around you and Harper. Take it at your own pace — this is a guide, not a test.";
  $("today").textContent=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  try {
    await loadCompletions();
    render();
    subscribeRealtime();
  } catch (err) {
    console.error("Could not load Daily Together data:", err);
    await client.auth.signOut();
    currentUser = null;
    currentRole = null;
    $("site").classList.add("hidden");
    $("login").classList.remove("hidden");
    setMessage("loginError", "Signed in, but the app could not load its data. Check that the Supabase setup SQL and policies have been run.");
  }
}
async function loadCompletions() {
  const {data,error}=await client.from("activity_completions")
    .select("id,user_id,activity_id,completion_date,photo_path,completed_at")
    .eq("completion_date",dateKey());
  if(error) throw error;
  completions=data||[];
}
function subscribeRealtime() {
  if(realtimeChannel) client.removeChannel(realtimeChannel);
  realtimeChannel=client.channel("daily-together-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"activity_completions"},async payload=>{
      if(payload.new?.completion_date===dateKey() || payload.old?.completion_date===dateKey()){
        await loadCompletions();render();
      }
    }).subscribe();
}
async function signedPhoto(path) {
  const {data,error}=await client.storage.from(BUCKET).createSignedUrl(path,60*60);
  if(error) {console.error(error);return null;}
  return data.signedUrl;
}
async function render() {
  const map=completionMap(), activities=allActivities();
  const done=activities.filter(a=>map.has(a.id)).length;
  const percent=Math.round(done/activities.length*100);
  $("percent").textContent=percent+"%";$("bar").style.width=percent+"%";
  $("count").textContent=`${done} of ${activities.length} activities completed`;
  $("finish").classList.toggle("hidden",done!==activities.length);
  $("timeline").innerHTML=ROUTINE.map((s,i)=>stepHtml(s,i,false,map)).join("");
  $("adminTimeline").innerHTML=ROUTINE.map((s,i)=>stepHtml(s,i,true,map)).join("");
  document.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>openUpload(Number(b.dataset.step))));
  if(currentRole==="admin") {
    const photos=done;
    $("stats").innerHTML=`<div class="stat"><strong>${done}/${activities.length}</strong><span>Activities completed</span></div><div class="stat"><strong>${activities.length-done}</strong><span>Still outstanding</span></div><div class="stat"><strong>${photos}</strong><span>Photo check-ins</span></div>`;
    for(const c of completions) {
      const a=document.querySelector(`[data-photo="${CSS.escape(c.activity_id)}"]`);
      if(a) {const url=await signedPhoto(c.photo_path);if(url)a.href=url;}
    }
  }
}
function stepHtml(section,index,admin,map) {
  const ids=section.tasks.map((_,j)=>activityId(index,j));
  const done=ids.every(id=>map.has(id));
  const any=ids.some(id=>map.has(id));
  const items=section.tasks.map((task,j)=>{
    const id=ids[j],c=map.get(id);
    const time=c?.completed_at?new Date(c.completed_at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"";
    return `<div class="task-item">${c?"✓ ":"○ "}${escapeHtml(task)}${c&&time?` · ${escapeHtml(time)}`:""}${admin&&c?` · <a class="photo-link" data-photo="${escapeHtml(id)}" href="#" target="_blank" rel="noopener">View photo</a>`:""}</div>`;
  }).join("");
  const action=admin?`<span class="complete">${done?"Completed ✓":any?"Partially complete":"Not started"}</span>`:
    `<button class="btn ${done?"":"primary"}" data-step="${index}" ${done?"disabled":""}>${done?"Completed ✓":"Add photo check-ins"}</button>`;
  return `<article class="step ${done?"done":""}"><div class="time">${section.time}</div><div class="number">${done?"✓":String(index+1).padStart(2,"0")}</div><div><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.subtitle)}</p><div class="task-items">${items}</div></div><div class="step-action">${action}</div></article>`;
}
function openUpload(index) {
  selectedStep=index;const s=ROUTINE[index],map=completionMap();
  $("modalTitle").textContent=s.time+" · "+s.title;
  $("modalDesc").textContent="Upload a photo for each activity that is not already complete.";
  const pending=s.tasks.map((task,j)=>({task,j,id:activityId(index,j)})).filter(x=>!map.has(x.id));
  $("uploadForm").innerHTML=`${pending.map(x=>`<div class="upload-task"><label>${escapeHtml(x.task)}</label><input type="file" accept="image/*" capture="environment" data-activity="${x.id}" required><img class="preview hidden" data-preview="${x.id}" alt="Photo preview"></div>`).join("")}<p id="uploadError" class="error"></p><button id="savePhoto" class="btn primary wide" type="submit">Upload photos & complete activities</button>`;
  $("uploadDialog").showModal();
  $("uploadForm").querySelectorAll('input[type=file]').forEach(input=>input.addEventListener("change",()=>{
    const f=input.files[0],img=$(`[data-preview="${input.dataset.activity}"]`);
    if(f){img.src=URL.createObjectURL(f);img.classList.remove("hidden");}
  }));
  $("uploadForm").onsubmit=saveStep;
}
async function compressImage(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=reject;
    reader.onload=()=>{
      const img=new Image();img.onerror=reject;img.onload=()=>{
        const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement("canvas");
        canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
        canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not process image")),"image/jpeg",.78);
      };img.src=reader.result;
    };reader.readAsDataURL(file);
  });
}
async function saveStep(event) {
  event.preventDefault();
  const form=$("uploadForm"),inputs=[...form.querySelectorAll('input[type=file]')];
  const error=form.querySelector(".error"),button=$("savePhoto");
  if(inputs.some(x=>!x.files[0])){error.textContent="Please add a photo for every outstanding activity in this time block.";return;}
  if(inputs.some(x=>x.files[0].size>12*1024*1024)){error.textContent="Please choose photos smaller than 12 MB each.";return;}
  button.disabled=true;button.textContent="Uploading photos…";
  try {
    for(const input of inputs) {
      const activity=input.dataset.activity,file=input.files[0],blob=await compressImage(file);
      const safeName=crypto.randomUUID()+".jpg";
      const path=`${currentUser.id}/${dateKey()}/${activity}/${safeName}`;
      const {error:uploadError}=await client.storage.from(BUCKET).upload(path,blob,{contentType:"image/jpeg",upsert:false});
      if(uploadError) throw uploadError;
      const {error:insertError}=await client.from("activity_completions").insert({
        user_id:currentUser.id,activity_id:activity,completion_date:dateKey(),photo_path:path
      });
      if(insertError) throw insertError;
    }
    await loadCompletions();$("uploadDialog").close();render();
  } catch(err) {
    error.textContent="An upload failed. Please check your connection and try again. If some activities saved already, they will remain complete.";
    console.error(err);
  } finally {button.disabled=false;button.textContent="Upload photos & complete activities";}
}
async function logout() {
  if(realtimeChannel){await client.removeChannel(realtimeChannel);realtimeChannel=null;}
  await client.auth.signOut();currentUser=null;currentRole=null;completions=[];
  $("site").classList.add("hidden");$("login").classList.remove("hidden");$("password").value="";
}
$("loginForm").addEventListener("submit",login);
$("logout").addEventListener("click",logout);
if (!ready) {
  setMessage("loginError", "Setup needed: add your Supabase Project URL and publishable key to supabase-config.js.");
} else {
  client.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error("Session restore error:", error);
      return;
    }
    if (data.session) {
      try {
        currentUser = data.session.user;
        await loadCurrentProfile();
        await enterApp();
      } catch (err) {
        console.error("Could not load the signed-in user's profile:", err);
        await client.auth.signOut();
        currentUser = null;
        currentRole = null;
        setMessage("loginError", "This Supabase account is not linked to a Daily Together profile. Check the profile IDs in the setup SQL.");
      }
    }
  });
}
})();