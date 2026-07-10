import { addDays, getTodayYmdKst, toIsoDate, toYmd } from "../shared/date.js";
import type { MealInfo, ScheduleInfo, SchoolInfo, TimetableInfo } from "./neis-client.js";

export const NEIS_KEY_MESSAGE =
  "NEIS_API_KEY 환경변수가 설정되지 않았습니다. 카카오클라우드 배포 설정에 나이스 Open API 인증키를 추가해주세요.";

export function getDefaultDateYmd(date?: string) {
  return date ? toYmd(date) : getTodayYmdKst();
}

export function getDefaultSchedulePeriod(from?: string, to?: string) {
  const start = from ? toYmd(from) : getTodayYmdKst();
  return {
    from: start,
    to: to ? toYmd(to) : toYmd(addDays(toIsoDate(start), 60)),
  };
}

export function formatSchools(schools: SchoolInfo[]) {
  if (schools.length === 0) {
    return "검색된 학교가 없습니다. 학교명이나 지역명을 조금 더 구체적으로 입력해주세요.";
  }

  return [
    "학교 검색 결과",
    ...schools.map((school, index) => {
      return `${index + 1}. ${school.schoolName} (${school.region}, ${school.schoolType})\n- 교육청코드: ${school.officeCode}\n- 학교코드: ${school.schoolCode}\n- 주소: ${school.address}`;
    }),
  ].join("\n");
}

export function formatMeals(meals: MealInfo[]) {
  if (meals.length === 0) {
    return "해당 날짜의 급식 정보가 없습니다.";
  }

  return meals
    .map((meal) => {
      return [`${toIsoDate(meal.date)} ${meal.mealName}`, ...meal.dishes.map((dish) => `- ${dish}`), meal.calories ? `열량: ${meal.calories}` : ""]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function formatSchedules(schedules: ScheduleInfo[], keyword?: string) {
  const filtered = keyword
    ? schedules.filter((item) => item.name.includes(keyword) || item.type?.includes(keyword))
    : schedules;

  if (filtered.length === 0) {
    return keyword ? `'${keyword}' 관련 학사일정이 없습니다.` : "조회 기간의 학사일정이 없습니다.";
  }

  return ["학사일정", ...filtered.map((item) => `- ${toIsoDate(item.date)} ${item.name}${item.type ? ` (${item.type})` : ""}`)].join("\n");
}

export function formatTimetable(items: TimetableInfo[], date: string, grade: string, className: string) {
  if (items.length === 0) {
    const isoDate = toIsoDate(date);
    if (isWeekendYmd(date)) {
      return `${isoDate}은 주말이라 시간표가 없습니다. 다음 등교일을 지정해 다시 조회해주세요.`;
    }
    return `${isoDate} ${grade}학년 ${className}반 시간표가 NEIS에 등록되어 있지 않습니다. 방학·휴일이거나 학년·반 정보가 다를 수 있으니 확인해주세요.`;
  }

  return [
    `${toIsoDate(date)} ${grade}학년 ${className}반 시간표`,
    ...items.map((item) => `- ${item.period}교시: ${item.subject}`),
  ].join("\n");
}

export function formatNeisError(error: unknown) {
  if (error instanceof Error && error.message === "NEIS_API_KEY_REQUIRED") {
    return NEIS_KEY_MESSAGE;
  }
  return "나이스 서버 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

function isWeekendYmd(ymd: string) {
  const date = new Date(Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8))));
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}
