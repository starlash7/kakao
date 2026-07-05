const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getTodayYmdKst() {
  return formatDateYmd(new Date(Date.now() + KST_OFFSET_MS));
}

export function getTodayIsoKst() {
  return toIsoDate(getTodayYmdKst());
}

export function toIsoDate(ymd: string) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

export function toYmd(date: string) {
  return date.replaceAll("-", "");
}

export function parseIsoDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateYmd(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}

export function formatDateIso(date: Date) {
  return toIsoDate(formatDateYmd(date));
}

export function addDays(date: string, days: number) {
  const value = parseIsoDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatDateIso(value);
}

export function getDaysBetween(start: string, end: string) {
  const diff = parseIsoDate(end).getTime() - parseIsoDate(start).getTime();
  return Math.floor(diff / 86_400_000) + 1;
}

export function getWeekdayKo(date: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][parseIsoDate(date).getUTCDay()];
}

export function isWeekend(date: string) {
  const day = parseIsoDate(date).getUTCDay();
  return day === 0 || day === 6;
}

export function enumerateDates(from: string, to: string) {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}
