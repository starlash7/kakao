import {
  addDays,
  enumerateDates,
  getDaysBetween,
  getWeekdayKo,
  isWeekend,
} from "../shared/date.js";
import { getHolidayMap } from "./holidays.js";

export type LeavePlan = {
  start: string;
  end: string;
  totalDays: number;
  leaveDates: string[];
  holidays: string[];
};

const holidayMap = getHolidayMap();

export function findGoldenHolidays(from: string, to: string, leaveDays: number) {
  const dates = enumerateDates(from, to);
  const candidates: LeavePlan[] = [];

  for (let start = 0; start < dates.length; start += 1) {
    const leaveDates: string[] = [];
    const holidays: string[] = [];

    for (let end = start; end < dates.length; end += 1) {
      const date = dates[end];

      if (holidayMap.has(date)) {
        holidays.push(`${date} ${holidayMap.get(date)}`);
      } else if (!isWeekend(date)) {
        leaveDates.push(date);
      }

      if (leaveDates.length > leaveDays) {
        break;
      }

      candidates.push({
        start: dates[start],
        end: date,
        totalDays: getDaysBetween(dates[start], date),
        leaveDates: [...leaveDates],
        holidays: [...holidays],
      });
    }
  }

  return selectTopPlans(candidates);
}

export function checkLeavePlan(dates: string[]) {
  const leaveDates = [...new Set(dates)].sort();
  if (leaveDates.length === 0) {
    return null;
  }

  let start = leaveDates[0];
  while (isFreeDay(addDays(start, -1), leaveDates)) {
    start = addDays(start, -1);
  }

  let end = leaveDates.at(-1) ?? leaveDates[0];
  while (isFreeDay(addDays(end, 1), leaveDates)) {
    end = addDays(end, 1);
  }

  return {
    start,
    end,
    totalDays: getDaysBetween(start, end),
    leaveDates,
    holidays: enumerateDates(start, end)
      .filter((date) => holidayMap.has(date))
      .map((date) => `${date} ${holidayMap.get(date)}`),
  };
}

export function formatDateKo(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}(${getWeekdayKo(date)})`;
}

function isFreeDay(date: string, leaveDates: string[]) {
  return isWeekend(date) || holidayMap.has(date) || leaveDates.includes(date);
}

function selectTopPlans(candidates: LeavePlan[]) {
  const sorted = candidates.sort((a, b) => {
    if (b.totalDays !== a.totalDays) return b.totalDays - a.totalDays;
    if (a.leaveDates.length !== b.leaveDates.length) return a.leaveDates.length - b.leaveDates.length;
    return a.start.localeCompare(b.start);
  });

  const selected: LeavePlan[] = [];
  for (const plan of sorted) {
    if (plan.totalDays < 2) continue;
    if (selected.every((item) => plan.end < item.start || plan.start > item.end)) {
      selected.push(plan);
    }
    if (selected.length === 3) break;
  }
  return selected;
}
