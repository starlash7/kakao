import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const BASE_URL = "https://open.neis.go.kr/hub";
const REGION_ALIASES = new Map([
  ["서울", "서울특별시"],
  ["서울시", "서울특별시"],
  ["부산", "부산광역시"],
  ["부산시", "부산광역시"],
  ["대구", "대구광역시"],
  ["대구시", "대구광역시"],
  ["인천", "인천광역시"],
  ["인천시", "인천광역시"],
  ["광주", "광주광역시"],
  ["광주시", "광주광역시"],
  ["대전", "대전광역시"],
  ["대전시", "대전광역시"],
  ["울산", "울산광역시"],
  ["울산시", "울산광역시"],
  ["세종", "세종특별자치시"],
  ["세종시", "세종특별자치시"],
  ["경기", "경기도"],
  ["강원", "강원특별자치도"],
  ["충북", "충청북도"],
  ["충남", "충청남도"],
  ["전북", "전북특별자치도"],
  ["전남", "전라남도"],
  ["경북", "경상북도"],
  ["경남", "경상남도"],
  ["제주", "제주특별자치도"],
]);

const tools = [
  {
    name: "search_school",
    annotations: {
      title: "우리 아이 학교 학교 검색",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    description:
      "우리 아이 학교 서비스는 학교 이름으로 학교코드와 교육청코드를 찾습니다. 다른 학교 도구를 쓰기 전에 먼저 호출하세요. 예: '서울대치초등학교 찾아줘', '대치초 서울특별시 학교코드 알려줘'",
    inputSchema: {
      type: "object",
      properties: {
        school_name: { type: "string", description: "검색할 학교 이름. 예: 서울대치초등학교" },
        region: { type: "string", description: "선택 지역명. 예: 서울특별시" },
      },
      required: ["school_name"],
    },
  },
  {
    name: "get_meal",
    annotations: {
      title: "우리 아이 학교 급식 조회",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    description: "우리 아이 학교 서비스는 특정 학교의 급식 메뉴를 조회합니다. 예: '오늘 서울대치초 급식 뭐야?', '내일 점심 메뉴 알려줘' 날짜는 YYYY-MM-DD 형식입니다.",
    inputSchema: {
      type: "object",
      properties: {
        office_code: { type: "string", description: "NEIS 교육청코드. 예: B10" },
        school_code: { type: "string", description: "NEIS 학교코드. 예: 7091380" },
        date: { type: "string", description: "급식 조회 날짜. YYYY-MM-DD 형식" },
      },
      required: ["office_code", "school_code"],
    },
  },
  {
    name: "get_school_schedule",
    annotations: {
      title: "우리 아이 학교 학사일정 조회",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    description: "우리 아이 학교 서비스는 시험, 방학, 개학, 재량휴업일 같은 학사일정을 조회합니다. 예: '중간고사 언제야?', '여름방학 일정 알려줘'",
    inputSchema: {
      type: "object",
      properties: {
        office_code: { type: "string", description: "NEIS 교육청코드. 예: B10" },
        school_code: { type: "string", description: "NEIS 학교코드. 예: 7091380" },
        from: { type: "string", description: "학사일정 조회 시작일. YYYY-MM-DD 형식" },
        to: { type: "string", description: "학사일정 조회 종료일. YYYY-MM-DD 형식" },
        keyword: { type: "string", description: "필터링할 일정 키워드. 예: 방학, 시험" },
      },
      required: ["office_code", "school_code"],
    },
  },
  {
    name: "get_timetable",
    annotations: {
      title: "우리 아이 학교 시간표 조회",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    description: "우리 아이 학교 서비스는 학년/반 시간표를 조회합니다. 학교명이나 학교코드가 없으면 먼저 학교를 확인하세요. 예: '서울대치초등학교 내일 3학년 2반 시간표 알려줘' 날짜는 YYYY-MM-DD 형식입니다.",
    inputSchema: {
      type: "object",
      properties: {
        office_code: { type: "string", description: "NEIS 교육청코드. 예: B10" },
        school_code: { type: "string", description: "NEIS 학교코드. 예: 7091380" },
        school_type: { type: "string", description: "학교급. 초, 중, 고 또는 elementary/middle/high" },
        grade: { type: "string", description: "학년. 예: 3" },
        class_name: { type: "string", description: "반. 예: 2" },
        date: { type: "string", description: "시간표 조회 날짜. YYYY-MM-DD 형식" },
      },
      required: ["office_code", "school_code", "school_type", "grade", "class_name"],
    },
  },
];

const server = http.createServer(async (req, res) => {
  if ((req.url === "/" || req.url === "/health") && req.method === "GET") {
    sendJson(res, { ok: true, service: "school-life" });
    return;
  }

  if ((req.url === "/mcp" || req.url === "/mcp/") && req.method === "POST") {
    const body = await readBody(req);
    await handleMcp(req, res, body);
    return;
  }

  sendJson(res, { error: "Not found" }, 404);
});

server.listen(PORT, HOST, () => {
  console.log(`school-life MCP server listening on ${HOST}:${PORT}`);
});

async function handleMcp(req, res, body) {
  const message = JSON.parse(body || "{}");

  if (message.method === "initialize") {
    sendMcp(res, req.headers["mcp-session-id"] ?? randomUUID(), {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: message.params?.protocolVersion ?? "2025-03-26",
        capabilities: { tools: { listChanged: true } },
        serverInfo: { name: "school-life-mcp", version: "0.1.0" },
      },
    });
    return;
  }

  if (message.method === "notifications/initialized") {
    res.writeHead(202).end();
    return;
  }

  if (message.method === "tools/list") {
    sendMcp(res, req.headers["mcp-session-id"], {
      jsonrpc: "2.0",
      id: message.id,
      result: { tools },
    });
    return;
  }

  if (message.method === "tools/call") {
    sendMcp(res, req.headers["mcp-session-id"], {
      jsonrpc: "2.0",
      id: message.id,
      result: { content: [{ type: "text", text: await callTool(message.params?.name, message.params?.arguments ?? {}) }] },
    });
    return;
  }

  sendMcp(res, req.headers["mcp-session-id"], {
    jsonrpc: "2.0",
    id: message.id ?? null,
    error: { code: -32601, message: "Method not found" },
  });
}

async function callTool(name, args) {
  try {
    if (name === "search_school") return formatSchools(await searchSchool(args.school_name, args.region));
    if (name === "get_meal") return formatMeals(await getMeal(args.office_code, args.school_code, getDateYmd(args.date)));
    if (name === "get_school_schedule") {
      const period = getSchedulePeriod(args.from, args.to);
      return formatSchedules(await getSchedule(args.office_code, args.school_code, period.from, period.to), args.keyword);
    }
    if (name === "get_timetable") {
      const date = getDateYmd(args.date);
      return formatTimetable(
        await getTimetable(args.office_code, args.school_code, args.school_type, args.grade, args.class_name, date),
        date,
        args.grade,
        args.class_name,
      );
    }
    return "알 수 없는 도구입니다.";
  } catch (error) {
    return formatNeisError(error);
  }
}

async function searchSchool(schoolName, region) {
  const regionName = normalizeRegionName(region);

  for (const term of getSchoolSearchTerms(schoolName)) {
    const rows = await fetchNeisRows("schoolInfo", { SCHUL_NM: term, LCTN_SC_NM: regionName, pSize: 5 });
    if (rows.length > 0) {
      return rows.map((row) => ({
        officeCode: value(row.ATPT_OFCDC_SC_CODE),
        officeName: value(row.ATPT_OFCDC_SC_NM),
        schoolCode: value(row.SD_SCHUL_CODE),
        schoolName: value(row.SCHUL_NM),
        schoolType: value(row.SCHUL_KND_SC_NM),
        region: value(row.LCTN_SC_NM),
        address: value(row.ORG_RDNMA),
      }));
    }
  }

  return [];
}

async function getMeal(officeCode, schoolCode, date) {
  const rows = await fetchNeisRows("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
    MLSV_YMD: date,
  });
  return rows.map((row) => ({
    mealName: value(row.MMEAL_SC_NM),
    date: value(row.MLSV_YMD),
    dishes: cleanDishNames(value(row.DDISH_NM)),
    calories: value(row.CAL_INFO),
  }));
}

async function getSchedule(officeCode, schoolCode, from, to) {
  const rows = await fetchNeisRows("SchoolSchedule", {
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
    AA_FROM_YMD: from,
    AA_TO_YMD: to,
    pSize: 100,
  });
  return rows.map((row) => ({
    date: value(row.AA_YMD),
    name: value(row.EVENT_NM),
    type: value(row.SBTR_DD_SC_NM),
  }));
}

async function getTimetable(officeCode, schoolCode, schoolType, grade, className, date) {
  const rows = await fetchNeisRows(getTimetableEndpoint(schoolType), {
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
    ALL_TI_YMD: date,
    GRADE: grade,
    CLASS_NM: className,
    pSize: 30,
  });
  return rows
    .map((row) => ({ period: value(row.PERIO), subject: value(row.ITRT_CNTNT) }))
    .filter((item) => item.period || item.subject);
}

async function fetchNeisRows(endpoint, params) {
  const key = process.env.NEIS_API_KEY;

  const url = new URL(`${BASE_URL}/${endpoint}`);
  if (key) url.searchParams.set("KEY", key);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");
  for (const [name, item] of Object.entries(params)) {
    if (item !== undefined && item !== "") url.searchParams.set(name, String(item));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return extractRows(endpoint, await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

function extractRows(endpoint, data) {
  const items = data?.[endpoint];
  if (!Array.isArray(items)) return [];
  const rowBlock = items.find((item) => item && typeof item === "object" && "row" in item);
  return rowBlock?.row ?? [];
}

function formatSchools(schools) {
  if (schools.length === 0) return "검색된 학교가 없습니다. 학교명이나 지역명을 조금 더 구체적으로 입력해주세요.";
  return [
    "학교 검색 결과",
    ...schools.map((school, index) => {
      return `${index + 1}. ${school.schoolName} (${school.region}, ${school.schoolType})\n- 교육청코드: ${school.officeCode}\n- 학교코드: ${school.schoolCode}\n- 주소: ${school.address}`;
    }),
  ].join("\n");
}

function formatMeals(meals) {
  if (meals.length === 0) return "해당 날짜의 급식 정보가 없습니다.";
  return meals
    .map((meal) => [`${toIsoDate(meal.date)} ${meal.mealName}`, ...meal.dishes.map((dish) => `- ${dish}`), meal.calories ? `열량: ${meal.calories}` : ""].filter(Boolean).join("\n"))
    .join("\n\n");
}

function formatSchedules(schedules, keyword) {
  const filtered = keyword ? schedules.filter((item) => item.name.includes(keyword) || item.type?.includes(keyword)) : schedules;
  if (filtered.length === 0) return keyword ? `'${keyword}' 관련 학사일정이 없습니다.` : "조회 기간의 학사일정이 없습니다.";
  return ["학사일정", ...filtered.map((item) => `- ${toIsoDate(item.date)} ${item.name}${item.type ? ` (${item.type})` : ""}`)].join("\n");
}

function formatTimetable(items, date, grade, className) {
  if (items.length === 0) return "해당 날짜의 시간표 정보가 없습니다.";
  return [`${toIsoDate(date)} ${grade}학년 ${className}반 시간표`, ...items.map((item) => `- ${item.period}교시: ${item.subject}`)].join("\n");
}

function formatNeisError(error) {
  return "나이스 서버 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

function normalizeRegionName(region) {
  const trimmed = region?.trim();
  if (!trimmed) return undefined;
  return REGION_ALIASES.get(trimmed) ?? trimmed;
}

function getSchoolSearchTerms(schoolName) {
  const trimmed = String(schoolName ?? "").trim();
  if (!trimmed) return [];

  return unique([
    trimmed,
    trimmed.replace(/초등학교$/, "초"),
    trimmed.replace(/중학교$/, "중"),
    trimmed.replace(/고등학교$/, "고"),
    trimmed.replace(/외고$/, "외국어고등학교"),
  ]);
}

function getSchedulePeriod(from, to) {
  const start = from ? toYmd(from) : todayYmdKst();
  return { from: start, to: to ? toYmd(to) : toYmd(addDays(toIsoDate(start), 60)) };
}

function getDateYmd(date) {
  return date ? toYmd(date) : todayYmdKst();
}

function getTimetableEndpoint(schoolType) {
  if (schoolType.includes("초")) return "elsTimetable";
  if (schoolType.includes("중")) return "misTimetable";
  return "hisTimetable";
}

function cleanDishNames(text) {
  return text.replaceAll("<br/>", "\n").split("\n").map((item) => item.replace(/\s*\([0-9.]+\)\s*/g, "").trim()).filter(Boolean);
}

function todayYmdKst() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("");
}

function addDays(date, days) {
  const value = parseIsoDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return [value.getUTCFullYear(), String(value.getUTCMonth() + 1).padStart(2, "0"), String(value.getUTCDate()).padStart(2, "0")].join("-");
}

function parseIsoDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(ymd) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function toYmd(date) {
  return date.replaceAll("-", "");
}

function value(item) {
  return item === undefined || item === null ? "" : String(item);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendMcp(res, sessionId, body) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "mcp-session-id": sessionId ?? randomUUID(),
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  res.end(`event: message\ndata: ${JSON.stringify(body)}\n\n`);
}
