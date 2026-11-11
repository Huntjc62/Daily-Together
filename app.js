// SIMPLE STATIC VERSION: credentials are deliberately in this file as requested.
// Anyone who can view the published website's source can see these credentials.
// Do not reuse these passwords for any other account.
const USERS = {
  Josh: { password: "JoshH", role: "admin" },
  Lily: { password: "LilyH", role: "partner" }
};

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
const todayKey = () => new Date().toLocaleDateString("en-CA");
const storeKey = () => "dailyTogether:" + todayKey();
let user = null, selectedStep = null, progress = {};
function loadProgress(){try{progress=JSON.parse(localStorage.getItem(storeKey())||"{}")}catch{progress={}}}
function saveProgress(){localStorage.setItem(storeKey(),JSON.stringify(progress));}
function safe(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function login(){
 const name=$("username").value.trim(), pass=$("password").value, account=USERS[name];
 if(!account||account.password!==pass){$("loginError").textContent="Those login details don't match. Please try again.";return;}
 user={name,role:account.role};sessionStorage.setItem("dailyTogetherUser",name);start();
}
function start(){
 $("login").classList.add("hidden");$("site").classList.remove("hidden");$("who").textContent=user.name+(user.role==="admin"?" · Admin":"");
 $("lilyView").classList.toggle("hidden",user.role!=="partner");$("joshView").classList.toggle("hidden",user.role!=="admin");
 $("headline").textContent=user.role==="admin"?"Here's how Lily's day is going.":"A calmer day starts here.";
 $("intro").textContent=user.role==="admin"?"See which steps Lily has completed and view her photo check-ins.":"A realistic routine built around you and Harper. Take it at your own pace — this is a guide, not a test.";
 $("today").textContent=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 loadProgress();render();
}
function render(){
 const total=ROUTINE.reduce((n,s)=>n+s.tasks.length,0),done=Object.keys(progress).length,pct=Math.round(done/total*100);
 $("percent").textContent=pct+"%";$("bar").style.width=pct+"%";$("count").textContent=`${done} of ${total} activities completed`;
 $("timeline").innerHTML=ROUTINE.map((s,i)=>stepHtml(s,i,false)).join("");
 $("adminTimeline").innerHTML=ROUTINE.map((s,i)=>stepHtml(s,i,true)).join("");
 $("finish").classList.toggle("hidden",done!==total);
 document.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>openUpload(b.dataset.step)));
 document.querySelectorAll("[data-view]").forEach(a=>a.addEventListener("click",()=>{const p=progress[a.dataset.view];if(p?.photo){const w=window.open();w.document.write(`<title>Uploaded photo</title><img style="max-width:100%;height:auto" src="${p.photo}">`);}}));
 const completed=Object.keys(progress).length;
 $("stats").innerHTML=`<div class="stat"><strong>${completed}/${total}</strong><span>Activities completed</span></div><div class="stat"><strong>${total-completed}</strong><span>Still outstanding</span></div><div class="stat"><strong>${Object.values(progress).filter(x=>x.photo).length}</strong><span>Photo check-ins</span></div>`;
}
function stepHtml(section,index,admin){
 const key=String(index), done=ROUTINE[index].tasks.every((_,j)=>progress[`${key}-${j}`]);
 const items=section.tasks.map((task,j)=>{
   const id=`${key}-${j}`,p=progress[id],isDone=!!p;
   if(admin)return `<div class="task-item">${isDone?"✓ ":"○ "}${safe(task)}${isDone&&p.time?` · ${safe(p.time)}`:""}${isDone&&p.photo?` · <a class="photo-link" data-view="${id}">View photo</a>`:""}</div>`;
   return `<div class="task-item">${isDone?"✓ ":"○ "}${safe(task)}</div>`;
 }).join("");
 const action=admin?`<span class="complete">${done?"Completed ✓":section.tasks.some((_,j)=>progress[`${key}-${j}`])?"Partially complete":"Not started"}</span>`:
   `<button class="btn ${done?"":"primary"}" data-step="${index}" ${done?"disabled":""}>${done?"Completed ✓":"Add photo check-ins"}</button>`;
 return `<article class="step ${done?"done":""}"><div class="time">${section.time}</div><div class="number">${done?"✓":String(index+1).padStart(2,"0")}</div><div><h3>${safe(section.title)}</h3><p>${safe(section.subtitle)}</p><div class="task-items">${items}</div></div><div class="step-action">${action}</div></article>`;
}
function openUpload(index){
 selectedStep=Number(index);const s=ROUTINE[selectedStep];
 $("modalTitle").textContent=s.time+" · "+s.title;$("modalDesc").textContent="Upload a photo for each activity in this step. Every activity needs its own photo before the step is complete.";
 $("uploadForm").innerHTML=`${s.tasks.map((task,j)=>`<div class="upload-task"><label>${safe(task)}</label><input type="file" accept="image/*" capture="environment" data-photo-index="${j}" required><img class="preview hidden" data-preview="${j}" alt="Selected photo preview"></div>`).join("")}<p id="uploadError" class="error"></p><button id="savePhoto" class="btn primary wide" type="submit">Upload photos & complete step</button>`;
 $("uploadDialog").showModal();
 $("uploadForm").querySelectorAll('input[type=file]').forEach(input=>input.addEventListener("change",()=>{
   const file=input.files[0],img=$(`[data-preview="${input.dataset.photoIndex}"]`);
   if(file){img.src=URL.createObjectURL(file);img.classList.remove("hidden");}
 }));
 $("uploadForm").onsubmit=saveStep;
}
async function saveStep(e){
 e.preventDefault();const inputs=[...$("uploadForm").querySelectorAll('input[type=file]')],error=$("uploadForm").querySelector(".error"),button=$("savePhoto");
 if(inputs.some(x=>!x.files[0])){error.textContent="Please add a photo for every activity in this step.";return;}
 if(inputs.some(x=>x.files[0].size>3*1024*1024)){error.textContent="Each photo must be smaller than 3 MB. Please choose smaller images.";return;}
 button.disabled=true;button.textContent="Saving photos…";
 try{
  const newEntries={};
  for(const input of inputs){
   const j=Number(input.dataset.photoIndex),file=input.files[0],data=await compressImage(file);
   newEntries[`${selectedStep}-${j}`]={photo:data,time:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),fileName:file.name};
  }
  progress={...progress,...newEntries};saveProgress();$("uploadDialog").close();render();
 }catch(err){error.textContent="There was a problem processing the photos. Please try again.";}
 finally{button.disabled=false;button.textContent="Upload photos & complete step";}
}
function compressImage(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{
   const img=new Image();img.onerror=reject;img.onload=()=>{
    const max=760,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");
    canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.58));
   };img.src=reader.result;
  };reader.readAsDataURL(file);
 });
}
$("loginForm").addEventListener("submit",e=>{e.preventDefault();login();});
$("logout").addEventListener("click",()=>{sessionStorage.removeItem("dailyTogetherUser");user=null;$("site").classList.add("hidden");$("login").classList.remove("hidden");$("password").value="";});
const saved=sessionStorage.getItem("dailyTogetherUser");if(saved&&USERS[saved]){user={name:saved,role:USERS[saved].role};start();}
