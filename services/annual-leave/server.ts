import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { textResult } from "../shared/response.js";
import { findGoldenHolidays, checkLeavePlan } from "./leave-calculator.js";
import { formatGoldenPlans, formatHolidayList, formatPlanResult } from "./messages.js";
import { resolvePeriod } from "./period.js";

export function createAnnualLeaveServer() {
  const server = new McpServer({
    name: "annual-leave-mcp",
    version: "0.1.0",
  });

  server.tool(
    "find_golden_holidays",
    "연차 개수로 공휴일·주말을 이어 최장 연휴를 찾습니다. 예: '올해 남은 연차 3개로 최장 연휴', '10월에 연차 3개 쓰면 최대 며칠 쉬어?' 날짜는 YYYY-MM-DD 형식입니다.",
    {
      leave_days: z.number().int().min(0).max(30),
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    },
    async ({ leave_days, year, month, from, to }) => {
      const period = resolvePeriod({ year, month, from, to });
      const plans = findGoldenHolidays(period.from, period.to, leave_days);
      return textResult(formatGoldenPlans(plans, leave_days, period.from, period.to));
    },
  );

  server.tool(
    "get_holidays",
    "특정 기간의 한국 공휴일과 대체공휴일을 알려줍니다. 예: '10월 공휴일 알려줘', '올해 남은 빨간날 뭐 있어?'",
    {
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    },
    async ({ year, month, from, to }) => {
      const period = resolvePeriod({ year, month, from, to });
      return textResult(formatHolidayList(period.from, period.to));
    },
  );

  server.tool(
    "check_leave_plan",
    "특정 날짜에 연차를 쓰면 실제로 며칠 연속 쉬는지 계산합니다. 예: '10월 6,7,8일 연차 쓰면 며칠 쉬어?' 날짜는 YYYY-MM-DD 배열입니다.",
    {
      dates: z.array(z.string()).min(1),
    },
    async ({ dates }) => textResult(formatPlanResult(checkLeavePlan(dates))),
  );

  return server;
}
