let shifts = JSON.parse(localStorage.getItem("macTrackerShiftsV3")) || JSON.parse(localStorage.getItem("macTrackerShifts")) || [];

let settings = JSON.parse(localStorage.getItem("macTrackerSettings")) || {
  hourlyRate: 12.41,
  nightBonusPercent: 40,
  scriptUrl: ""
};

let viewDate = new Date();

function save() {
  localStorage.setItem("macTrackerShiftsV3", JSON.stringify(shifts));
}

function saveSet() {
  localStorage.setItem("macTrackerSettings", JSON.stringify(settings));
}

function el(id) {
  return document.getElementById(id);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function key(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmt(s) {
  return new Date(s + "T12:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });
}

function hrs(st, en) {
  let a = new Date(`2000-01-01T${st}:00`);
  let b = new Date(`2000-01-01T${en}:00`);
  if (b <= a) b.setDate(b.getDate() + 1);
  return (b - a) / 36e5;
}

function night(st, en) {
  let a = new Date(`2000-01-01T${st}:00`);
  let b = new Date(`2000-01-01T${en}:00`);
  if (b <= a) b.setDate(b.getDate() + 1);

  let midnight = new Date("2000-01-02T00:00:00");
  let start = a > midnight ? a : midnight;

  return Math.max(0, (b - start) / 36e5);
}

function addObj(o) {
  let exists = shifts.some(s =>
    s.date === o.date &&
    s.start === o.start &&
    s.end === o.end &&
    s.position === o.position
  );

  if (!exists) {
    shifts.push({
      ...o,
      id: Date.now() + Math.random(),
      hours: hrs(o.start, o.end),
      nightHours: night(o.start, o.end)
    });
  }
}

function addShift() {
  let date = el("date").value;
  let start = el("start").value;
  let end = el("end").value;
  let position = el("position").value.trim() || "-";

  if (!date || !start || !end) {
    alert("Fill date, start and end time.");
    return;
  }

  addObj({ date, start, end, position });

  shifts.sort((a, b) => new Date(a.date) - new Date(b.date));
  save();
  render();

  ["date", "start", "end", "position"].forEach(id => el(id).value = "");
}

function del(id) {
  shifts = shifts.filter(s => s.id !== id);
  save();
  render();
}

function clearAll() {
  if (confirm("Delete all shifts in this browser?")) {
    shifts = [];
    save();
    render();
  }
}

function changeMonth(n) {
  viewDate.setMonth(viewDate.getMonth() + n);
  render();
}

function importText() {
  let text = el("importText").value;

  let months = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,

    januari: 0,
    februari: 1,
    maart: 2,
    april: 3,
    mei: 4,
    juni: 5,
    juli: 6,
    augustus: 7,
    september: 8,
    oktober: 9,
    november: 10,
    december: 11
  };

  let re = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})(?:,\s*([A-Z]+))?/gi;

  let m;
  let count = 0;

  while ((m = re.exec(text)) !== null) {
    let month = months[m[3].toLowerCase()];
    if (month === undefined) continue;

    addObj({
      date: `${m[4]}-${pad(month + 1)}-${pad(m[2])}`,
      start: m[5],
      end: m[6],
      position: m[7] || "Imported"
    });

    count++;
  }

  if (!count) {
    alert("No shifts found. Try this format: vrijdag 17 juli 2026 20:30 - 02:30, MPS");
    return;
  }

  el("importText").value = "";
  shifts.sort((a, b) => new Date(a.date) - new Date(b.date));
  save();
  render();
}

function openSettings() {
  el("hourlyRateInput").value = settings.hourlyRate;
  el("nightBonusInput").value = settings.nightBonusPercent;
  el("scriptUrlInput").value = settings.scriptUrl || "";
  el("settingsDialog").showModal();
}

function closeSettings() {
  el("settingsDialog").close();
}

function saveSettings() {
  settings.hourlyRate = Number(el("hourlyRateInput").value) || 12.41;
  settings.nightBonusPercent = Number(el("nightBonusInput").value) || 40;
  settings.scriptUrl = el("scriptUrlInput").value.trim();

  saveSet();
  closeSettings();
  render();
}

function syncFromCalendar() {
  if (!settings.scriptUrl) {
    alert("Paste your Apps Script Web App URL in Settings first.");
    return;
  }

  let cb = "calendarSyncCallback_" + Date.now();

  window[cb] = data => {
    try {
      if (!data || !Array.isArray(data.shifts)) {
        throw Error("No shifts returned");
      }

      data.shifts.forEach(addObj);
      shifts.sort((a, b) => new Date(a.date) - new Date(b.date));
      save();
      render();

      alert("Synced " + data.shifts.length + " shifts from Google Calendar.");
    } catch (e) {
      alert("Sync failed: " + e.message);
    }

    delete window[cb];
    document.getElementById(cb)?.remove();
  };

  let s = document.createElement("script");
  s.id = cb;
  s.src = settings.scriptUrl + (settings.scriptUrl.includes("?") ? "&" : "?") + "callback=" + cb;
  s.onerror = () => alert("Could not load Apps Script URL.");
  document.body.appendChild(s);
}

function requestNotifications() {
  if (!("Notification" in window)) {
    alert("Your browser does not support notifications.");
    return;
  }

  Notification.requestPermission().then(p => {
    alert(p === "granted" ? "Reminders enabled." : "Notifications not allowed.");
  });
}

setInterval(() => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  let now = new Date();

  shifts.forEach(s => {
    let st = new Date(`${s.date}T${s.start}:00`);
    let diff = st - now;

    if (diff > 0 && diff < 61 * 60 * 1000 && !s.reminded) {
      new Notification("McDonald's shift reminder", {
        body: `You work at ${s.start} today (${s.position}).`
      });

      s.reminded = true;
      save();
    }
  });
}, 60000);

function render() {
  let y = viewDate.getFullYear();
  let m = viewDate.getMonth();

  el("calendarTitle").textContent = viewDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  });

  let first = new Date(y, m, 1);
  let start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));

  let calendar = el("calendar");
  calendar.innerHTML = "";

  let today = key(new Date());

  for (let i = 0; i < 42; i++) {
    let d = new Date(start);
    d.setDate(start.getDate() + i);

    let k = key(d);
    let ds = shifts.filter(s => s.date === k);

    calendar.innerHTML += `
      <div class="day ${d.getMonth() !== m ? "other" : ""} ${k === today ? "today" : ""}">
        <div class="num">${d.getDate()}</div>
        ${ds.map(s => `<div class="event">${s.start}-${s.end} ${s.position}</div>`).join("")}
      </div>
    `;
  }

  let ms = shifts.filter(s => {
    let d = new Date(s.date + "T12:00");
    return d.getMonth() === m && d.getFullYear() === y;
  });

  let mh = ms.reduce((a, s) => a + (s.hours || hrs(s.start, s.end)), 0);
  let nh = ms.reduce((a, s) => a + (s.nightHours ?? night(s.start, s.end)), 0);

  let base = mh * settings.hourlyRate;
  let bonus = nh * settings.hourlyRate * (settings.nightBonusPercent / 100);

  el("monthHours").textContent = mh.toFixed(1) + "h";
  el("monthSalary").textContent = "€" + (base + bonus).toFixed(2);
  el("nightBonus").textContent = "€" + bonus.toFixed(2);
  el("monthShifts").textContent = ms.length;
  el("avgShift").textContent = (ms.length ? mh / ms.length : 0).toFixed(1) + "h";
  el("longestShift").textContent = (ms.length ? Math.max(...ms.map(s => s.hours || hrs(s.start, s.end))) : 0).toFixed(1) + "h";
  el("nightHours").textContent = nh.toFixed(1) + "h";

  let future = shifts
    .filter(s => new Date(`${s.date}T${s.start}:00`) >= new Date())
    .sort((a, b) => new Date(`${a.date}T${a.start}:00`) - new Date(`${b.date}T${b.start}:00`));

  el("nextShift").textContent = future[0]
    ? `${fmt(future[0].date)} ${future[0].start}`
    : "None";

  el("shiftList").innerHTML = shifts.length
    ? shifts.map(s => `
      <div class="shift">
        <div>
          <b>${fmt(s.date)} • ${s.start}-${s.end}</b>
          <span>${s.position} • ${(s.hours || hrs(s.start, s.end)).toFixed(1)} hours</span>
        </div>
        <button class="danger mini" onclick="del(${s.id})">Delete</button>
      </div>
    `).join("")
    : `<p class="muted">No shifts yet.</p>`;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
