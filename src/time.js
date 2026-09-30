const BANGKOK_TIME_ZONE = "Asia/Bangkok";

function parseDatabaseTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const timestamp = String(value);
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)
    ? timestamp
    : `${timestamp.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBangkokDateTime(value) {
  const date = parseDatabaseTimestamp(value);
  if (!date) return value || "-";

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatBangkokClock(value, options = {}) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    ...options,
  }).format(value);
}

export function formatBangkokDate(value, options = {}) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(value);
}
