let shifts = JSON.parse(localStorage.getItem("macTrackerShifts")) || [];
let viewDate = new Date();
const hourlyRate = 12.41; // change when your wage changes

function save(){ localStorage.setItem("macTrackerShifts", JSON.stringify(shifts)); }
function pad(n){ return String(n).padStart(2,"0"); }
function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function fmtDate(s){ return new Date(s+"T12:00").toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"}); }
function hours(start,end){
  const a=new Date(`2000-01-01T${start}:00`), b=new Date(`2000-01-01T${end}:00`);
  if(b<=a)b.setDate(b.getDate()+1);
  return (b-a)/36e5;
}
function addShift(){
  const date=document.getElementById("date").value, start=document.getElementById("start").value, end=document.getElementById("end").value;
  const position=document.getElementById("position").value.trim() || "-";
  if(!date||!start||!end){ alert("Fill date, start and end time."); return; }
  shifts.push({id:Date.now()+Math.random(),date,start,end,position,hours:hours(start,end)});
  shifts.sort((a,b)=>new Date(a.date)-new Date(b.date));
  save(); render();
  ["date","start","end","position"].forEach(id=>document.getElementById(id).value="");
}
function del(id){ shifts=shifts.filter(s=>s.id!==id); save(); render(); }
function clearAll(){ if(confirm("Delete all shifts?")){ shifts=[]; save(); render(); } }
function changeMonth(n){ viewDate.setMonth(viewDate.getMonth()+n); render(); }

function importText(){
  const text=document.getElementById("importText").value;
  const months={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11,
  januari:0,februari:1,maart:2,mei:4,juni:5,juli:6,augustus:7,oktober:9};
  const re=/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+(\d{1,2})\s+([a-zA-Z]+).*?(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/gi;
  let m, count=0, year=new Date().getFullYear();
  while((m=re.exec(text))!==null){
    const month=months[m[3].toLowerCase()];
    if(month===undefined) continue;
    const date=`${year}-${pad(month+1)}-${pad(m[2])}`;
    const start=m[4], end=m[5];
    shifts.push({id:Date.now()+Math.random()+count,date,start,end,position:"Imported",hours:hours(start,end)});
    count++;
  }
  if(count===0) alert("No shifts found. Paste the full schedule text.");
  document.getElementById("importText").value="";
  shifts.sort((a,b)=>new Date(a.date)-new Date(b.date));
  save(); render();
}

function requestNotifications(){
  if(!("Notification" in window)){ alert("Your browser does not support notifications."); return; }
  Notification.requestPermission().then(p=>alert(p==="granted"?"Reminders enabled. Keep this page open for browser reminders.":"Notifications not allowed."));
}

function checkReminders(){
  if(!("Notification" in window) || Notification.permission!=="granted") return;
  const now=new Date();
  shifts.forEach(s=>{
    const start=new Date(`${s.date}T${s.start}:00`);
    const diff=start-now;
    if(diff>0 && diff<61*60*1000 && !s.reminded){
      new Notification("McDonald's shift reminder",{body:`You work at ${s.start} today.`});
      s.reminded=true; save();
    }
  });
}
setInterval(checkReminders,60000);

function render(){
  const y=viewDate.getFullYear(), m=viewDate.getMonth();
  document.getElementById("calendarTitle").textContent=viewDate.toLocaleDateString("en-GB",{month:"long",year:"numeric"});
  const first=new Date(y,m,1), start=new Date(first);
  const mondayOffset=(first.getDay()+6)%7;
  start.setDate(1-mondayOffset);
  const cal=document.getElementById("calendar"); cal.innerHTML="";
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const key=dateKey(d);
    const dayShifts=shifts.filter(s=>s.date===key);
    cal.innerHTML += `<div class="day ${d.getMonth()!==m?"other":""}">
      <div class="day-number">${d.getDate()}</div>
      ${dayShifts.map(s=>`<div class="event">${s.start}-${s.end}</div>`).join("")}
    </div>`;
  }

  const monthShifts=shifts.filter(s=>{const d=new Date(s.date+"T12:00"); return d.getMonth()===m && d.getFullYear()===y;});
  const monthHours=monthShifts.reduce((a,s)=>a+s.hours,0);
  document.getElementById("monthHours").textContent=monthHours.toFixed(1)+"h";
  document.getElementById("monthSalary").textContent="€"+(monthHours*hourlyRate).toFixed(2);
  document.getElementById("totalShifts").textContent=monthShifts.length;

  const future=shifts.filter(s=>new Date(`${s.date}T${s.start}:00`)>=new Date()).sort((a,b)=>new Date(`${a.date}T${a.start}:00`)-new Date(`${b.date}T${b.start}:00`));
  document.getElementById("nextShift").textContent=future[0]?`${fmtDate(future[0].date)} ${future[0].start}`:"None";

  const list=document.getElementById("shiftList");
  list.innerHTML = shifts.length ? shifts.map(s=>`<div class="shift">
    <div><b>${fmtDate(s.date)} • ${s.start}-${s.end}</b><span>${s.position} • ${s.hours.toFixed(1)} hours</span></div>
    <button class="danger mini" onclick="del(${s.id})">Delete</button>
  </div>`).join("") : `<p class="muted">No shifts yet.</p>`;
}
render();
