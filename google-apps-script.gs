// OPTIONAL: Google Apps Script helper.
// This creates calendar events from McDonald's emails.
// Use later when you are ready for Gmail import.
// Apps Script: script.google.com → New project → paste this.

function importMcdonaldsScheduleToCalendar() {
  const threads = GmailApp.search('from:1131@nl.mcd.com newer_than:60d');
  const calendar = CalendarApp.getDefaultCalendar();
  const year = new Date().getFullYear();

  const months = {
    january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11,
    januari:0, februari:1, maart:2, mei:4, juni:5, juli:6, augustus:7, oktober:9
  };

  threads.forEach(thread => {
    thread.getMessages().forEach(msg => {
      const body = msg.getPlainBody();
      const regex = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+(\d{1,2})\s+([a-zA-Z]+).*?(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/gi;
      let match;

      while ((match = regex.exec(body)) !== null) {
        const day = Number(match[2]);
        const month = months[match[3].toLowerCase()];
        if (month === undefined) continue;

        const startParts = match[4].split(':').map(Number);
        const endParts = match[5].split(':').map(Number);

        const start = new Date(year, month, day, startParts[0], startParts[1]);
        const end = new Date(year, month, day, endParts[0], endParts[1]);
        if (end <= start) end.setDate(end.getDate() + 1);

        const title = "McDonald's shift";
        const existing = calendar.getEvents(start, end, { search: title });
        if (existing.length === 0) {
          calendar.createEvent(title, start, end, {
            description: "Imported from McDonald's Gmail schedule"
          }).addPopupReminder(60);
        }
      }
    });
  });
}
