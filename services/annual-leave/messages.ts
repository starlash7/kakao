import { filterHolidays } from "./holidays.js";
import { formatDateKo, type LeavePlan } from "./leave-calculator.js";

export function formatHolidayList(from: string, to: string) {
  const holidays = filterHolidays(from, to);
  if (holidays.length === 0) {
    return `${from}~${to} 기간에 등록된 공휴일이 없습니다.`;
  }

  return [
    `${from}~${to} 공휴일`,
    ...holidays.map((holiday) => `- ${formatDateKo(holiday.date)} ${holiday.name}`),
  ].join("\n");
}

export function formatGoldenPlans(plans: LeavePlan[], leaveDays: number, from: string, to: string) {
  if (plans.length === 0) {
    return `${from}~${to} 기간에는 연차 ${leaveDays}개로 만들 수 있는 2일 이상 연휴가 없습니다.`;
  }

  return [
    `연차 ${leaveDays}개 기준 최장 연휴 추천`,
    ...plans.map((plan, index) => formatPlan(index + 1, plan)),
  ].join("\n\n");
}

export function formatPlanResult(plan: LeavePlan | null) {
  if (!plan) {
    return "연차 사용일을 1개 이상 입력해주세요.";
  }
  return formatPlan(1, plan);
}

function formatPlan(rank: number, plan: LeavePlan) {
  const leaveText =
    plan.leaveDates.length === 0
      ? "연차 사용 없음"
      : `연차 ${plan.leaveDates.map(formatDateKo).join(", ")}`;
  const holidayText = plan.holidays.length > 0 ? `공휴일: ${plan.holidays.join(", ")}` : "";

  return [
    `${rank}. ${formatDateKo(plan.start)}~${formatDateKo(plan.end)} ${plan.totalDays}일 휴무`,
    leaveText,
    holidayText,
  ]
    .filter(Boolean)
    .join("\n");
}
