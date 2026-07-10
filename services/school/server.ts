import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { textResult } from "../shared/response.js";
import {
  formatMeals,
  formatNeisError,
  formatSchedules,
  formatSchools,
  formatTimetable,
  getDefaultDateYmd,
  getDefaultSchedulePeriod,
} from "./messages.js";
import { getMeal, getSchedule, getTimetable, searchSchool } from "./neis-client.js";

export function createSchoolServer() {
  const server = new McpServer({
    name: "school-life-mcp",
    version: "0.1.0",
  });

  server.tool(
    "search_school",
    "학교 이름으로 학교코드와 교육청코드를 찾습니다. 다른 학교 도구를 쓰기 전에 먼저 호출하세요. 예: '서울대치초등학교 찾아줘', '대치초 서울특별시 학교코드 알려줘'",
    { school_name: z.string(), region: z.string().optional() },
    async ({ school_name, region }) => handleTool(async () => formatSchools(await searchSchool(school_name, region))),
  );

  server.tool(
    "get_meal",
    "특정 학교의 급식 메뉴를 조회합니다. 예: '오늘 서울대치초 급식 뭐야?', '내일 점심 메뉴 알려줘' 날짜는 YYYY-MM-DD 형식입니다.",
    {
      office_code: z.string(),
      school_code: z.string(),
      date: z.string().optional(),
    },
    async ({ office_code, school_code, date }) => {
      const ymd = getDefaultDateYmd(date);
      return handleTool(async () => formatMeals(await getMeal(office_code, school_code, ymd)));
    },
  );

  server.tool(
    "get_school_schedule",
    "시험, 방학, 개학, 재량휴업일 같은 학사일정을 조회합니다. 예: '중간고사 언제야?', '여름방학 일정 알려줘'",
    {
      office_code: z.string(),
      school_code: z.string(),
      from: z.string().optional(),
      to: z.string().optional(),
      keyword: z.string().optional(),
    },
    async ({ office_code, school_code, from, to, keyword }) => {
      const period = getDefaultSchedulePeriod(from, to);
      return handleTool(async () => {
        const schedules = await getSchedule(office_code, school_code, period.from, period.to);
        return formatSchedules(schedules, keyword);
      });
    },
  );

  server.tool(
    "get_timetable",
    "우리 아이 학교 서비스는 학년/반 시간표를 조회합니다. 학교명이나 학교코드가 없으면 먼저 학교를 확인하세요. 예: '서울대치초등학교 3학년 2반 2026-07-10 시간표 알려줘' 주말과 방학에는 시간표가 없을 수 있습니다.",
    {
      office_code: z.string(),
      school_code: z.string(),
      school_type: z.string(),
      grade: z.string(),
      class_name: z.string(),
      date: z.string().optional(),
    },
    async ({ office_code, school_code, school_type, grade, class_name, date }) => {
      const ymd = getDefaultDateYmd(date);
      return handleTool(async () => {
        const timetable = await getTimetable(office_code, school_code, school_type, grade, class_name, ymd);
        return formatTimetable(timetable, ymd, grade, class_name);
      });
    },
  );

  return server;
}

async function handleTool(runTool: () => Promise<string>) {
  try {
    return textResult(await runTool());
  } catch (error) {
    return textResult(formatNeisError(error));
  }
}
