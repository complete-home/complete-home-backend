/** Parse display / form dates into end-of-day deadline for timeliness checks. */
export function parseScheduleDate(value) {
  if (value == null || value === "" || value === "—" || value === "-") {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return endOfDay(value);
  }
  const s = String(value).trim();
  if (!s) return null;

  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return endOfDay(new Date(iso));

  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return endOfDay(d);
  }

  const named = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (named) {
    const d = new Date(`${named[2]} ${named[1]}, ${named[3]}`);
    if (!Number.isNaN(d.getTime())) return endOfDay(d);
  }

  return null;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function monthKeyFromDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * @returns {{ status: 'on_time'|'late'|'overdue'|'pending'|'not_applicable', dueAt: Date|null, completedAt?: Date }}
 */
export function evaluateTimeliness({ dueAt, completedAt, isComplete }) {
  if (!dueAt) {
    return {
      status: "not_applicable",
      dueAt: null,
      completedAt: completedAt || null,
    };
  }
  const now = new Date();
  if (!isComplete) {
    if (now > dueAt) {
      return { status: "overdue", dueAt, completedAt: null };
    }
    return { status: "pending", dueAt, completedAt: null };
  }
  const doneAt = completedAt || now;
  if (doneAt <= dueAt) {
    return { status: "on_time", dueAt, completedAt: doneAt };
  }
  return { status: "late", dueAt, completedAt: doneAt };
}

export const TIMELINESS_LABELS = {
  on_time: "On time",
  late: "Late",
  overdue: "Overdue",
  pending: "In progress",
  not_applicable: "No deadline",
};
