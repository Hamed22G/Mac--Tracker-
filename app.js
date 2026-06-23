let shifts = JSON.parse(localStorage.getItem("mcdShifts")) || [];

const hourlyRate = 12.41; // Change this if your hourly wage changes

function calculateHours(start, end) {
  const startTime = new Date(`2000-01-01T${start}:00`);
  const endTime = new Date(`2000-01-01T${end}:00`);

  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }

  return (endTime - startTime) / (1000 * 60 * 60);
}

function getDayName(dateString) {
  return new Date(dateString + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long"
  });
}

function formatDate(dateString) {
  return new Date(dateString + "T12:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function addShift() {
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const position = document.getElementById("position").value.trim() || "-";

  if (!date || !start || !end) {
    alert("Please fill date, start time and end time.");
    return;
  }

  const hours = calculateHours(start, end);

  shifts.push({
    id: Date.now(),
    date,
    start,
    end,
    position,
    hours
  });

  shifts.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveData();
  render();

  document.getElementById("date").value = "";
  document.getElementById("start").value = "";
  document.getElementById("end").value = "";
  document.getElementById("position").value = "";
}

function deleteShift(id) {
  shifts = shifts.filter(shift => shift.id !== id);
  saveData();
  render();
}

function clearAll() {
  if (confirm("Delete all saved shifts?")) {
    shifts = [];
    saveData();
    render();
  }
}

function saveData() {
  localStorage.setItem("mcdShifts", JSON.stringify(shifts));
}

function render() {
  const table = document.getElementById("shiftTable");
  table.innerHTML = "";

  let totalHours = 0;
  let monthHours = 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  shifts.forEach(shift => {
    totalHours += shift.hours;

    const shiftDate = new Date(shift.date + "T12:00:00");
    if (shiftDate.getMonth() === currentMonth && shiftDate.getFullYear() === currentYear) {
      monthHours += shift.hours;
    }

    table.innerHTML += `
      <tr>
        <td>${formatDate(shift.date)}</td>
        <td>${getDayName(shift.date)}</td>
        <td>${shift.start}</td>
        <td>${shift.end}</td>
        <td>${shift.position}</td>
        <td>${shift.hours.toFixed(1)}</td>
        <td><button class="delete-btn" onclick="deleteShift(${shift.id})">Delete</button></td>
      </tr>
    `;
  });

  if (shifts.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="empty">No shifts yet. Add your first workday above.</td></tr>`;
  }

  const futureShifts = shifts
    .filter(shift => new Date(`${shift.date}T${shift.start}:00`) >= new Date())
    .sort((a, b) => new Date(`${a.date}T${a.start}:00`) - new Date(`${b.date}T${b.start}:00`));

  document.getElementById("totalHours").innerText = totalHours.toFixed(1);
  document.getElementById("salary").innerText = "€" + (totalHours * hourlyRate).toFixed(2);
  document.getElementById("totalShifts").innerText = shifts.length;
  document.getElementById("monthTotal").innerText = `This month: ${monthHours.toFixed(1)} hours`;
  document.getElementById("nextShift").innerText = futureShifts.length
    ? `${formatDate(futureShifts[0].date)} ${futureShifts[0].start}`
    : "None";
}

render();
