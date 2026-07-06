import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const holidays = [
  ["2026-01-01", "신정"],
  ["2026-02-16", "설날 연휴"],
  ["2026-02-17", "설날"],
  ["2026-02-18", "설날 연휴"],
  ["2026-03-01", "삼일절"],
  ["2026-03-02", "대체공휴일(삼일절)"],
  ["2026-05-01", "근로자의날"],
  ["2026-05-05", "어린이날"],
  ["2026-05-24", "부처님오신날"],
  ["2026-05-25", "대체공휴일(부처님오신날)"],
  ["2026-06-03", "제9회 전국동시지방선거"],
  ["2026-06-06", "현충일"],
  ["2026-07-17", "제헌절"],
  ["2026-08-15", "광복절"],
  ["2026-08-17", "대체공휴일(광복절)"],
  ["2026-09-24", "추석 연휴"],
  ["2026-09-25", "추석"],
  ["2026-09-26", "추석 연휴"],
  ["2026-10-03", "개천절"],
  ["2026-10-05", "대체공휴일(개천절)"],
  ["2026-10-09", "한글날"],
  ["2026-12-25", "성탄절"],
];

const holidayMap = new Map(holidays);

const tools = [
  {
    name: "find_golden_holidays",
    description:
      "연차 개수로 공휴일·주말을 이어 최장 연휴를 찾습니다. 예: '올해 남은 연차 3개로 최장 연휴', '10월에 연차 3개 쓰면 최대 며칠 쉬어?'",
    inputSchema: {
      type: "object",
      properties: {
        leave_days: { type: "integer", minimum: 0, maximum: 30 },
        year: { type: "integer" },
        month: { type: "integer", minimum: 1, maximum: 12 },
        from: { type: "string" },
        to: { type: "string" },
      },
      required: ["leave_days"],
    },
  },
  {
    name: "get_holidays",
    description: "특정 기간의 한국 공휴일과 대체공휴일을 알려줍니다. 예: '10월 공휴일 알려줘', '올해 남은 빨간날 뭐 있어?'",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "integer" },
        month: { type: "integer", minimum: 1, maximum: 12 },
        from: { type: "string" },
        to: { type: "string" },
      },
    },
  },
  {
    name: "check_leave_plan",
    description: "특정 날짜에 연차를 쓰면 실제로 며칠 연속 쉬는지 계산합니다. 예: '10월 6,7,8일 연차 쓰면 며칠 쉬어?'",
    inputSchema: {
      type: "object",
      properties: { dates: { type: "array", minItems: 1, items: { type: "string" } } },
      required: ["dates"],
    },
  },
];

const server = http.createServer(async (req, res) => {
  if ((req.url === "/" || req.url === "/health") && req.method === "GET") {
    sendJson(res, { ok: true, service: "annual-leave" });
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
  console.log(`annual-leave MCP server listening on ${HOST}:${PORT}`);
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
        serverInfo: { name: "annual-leave-mcp", version: "0.1.0" },
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
      result: {
        content: [{ type: "text", text: callTool(message.params?.name, message.params?.arguments ?? {}) }],
      },
    });
    return;
  }

  sendMcp(res, req.headers["mcp-session-id"], {
    jsonrpc: "2.0",
    id: message.id ?? null,
    error: { code: -32601, message: "Method not found" },
  });
}

function callTool(name, args) {
  if (name === "find_golden_holidays") {
    const period = resolvePeriod(args);
    return formatGoldenPlans(findGoldenHolidays(period.from, period.to, Number(args.leave_days ?? 0)), Number(args.leave_days ?? 0), period);
  }
  if (name === "get_holidays") {
    const period = resolvePeriod(args);
    return formatHolidayList(period.from, period.to);
  }
  if (name === "check_leave_plan") {
    return formatPlan(checkLeavePlan(args.dates ?? []));
  }
  return "알 수 없는 도구입니다.";
}

function resolvePeriod(args) {
  if (args.from || args.to) {
    return { from: args.from ?? todayIsoKst(), to: args.to ?? "2026-12-31" };
  }
  if (args.year && args.month) {
    const month = String(args.month).padStart(2, "0");
    const lastDay = new Date(Date.UTC(args.year, args.month, 0)).getUTCDate();
    return { from: `${args.year}-${month}-01`, to: `${args.year}-${month}-${lastDay}` };
  }
  if (args.year) {
    return { from: `${args.year}-01-01`, to: `${args.year}-12-31` };
  }
  return { from: todayIsoKst(), to: "2026-12-31" };
}

function findGoldenHolidays(from, to, leaveDays) {
  const dates = enumerateDates(from, to);
  const candidates = [];
  for (let start = 0; start < dates.length; start += 1) {
    const leaveDates = [];
    const holidayNames = [];
    for (let end = start; end < dates.length; end += 1) {
      const date = dates[end];
      if (holidayMap.has(date)) holidayNames.push(`${date} ${holidayMap.get(date)}`);
      else if (!isWeekend(date)) leaveDates.push(date);
      if (leaveDates.length > leaveDays) break;
      candidates.push({ start: dates[start], end: date, totalDays: getDaysBetween(dates[start], date), leaveDates: [...leaveDates], holidays: [...holidayNames] });
    }
  }
  return candidates
    .sort((a, b) => b.totalDays - a.totalDays || a.leaveDates.length - b.leaveDates.length || a.start.localeCompare(b.start))
    .filter((plan) => plan.totalDays >= 2)
    .reduce((selected, plan) => {
      if (selected.length < 3 && selected.every((item) => plan.end < item.start || plan.start > item.end)) selected.push(plan);
      return selected;
    }, []);
}

function checkLeavePlan(dates) {
  const leaveDates = [...new Set(dates)].sort();
  if (leaveDates.length === 0) return null;
  let start = leaveDates[0];
  while (isFreeDay(addDays(start, -1), leaveDates)) start = addDays(start, -1);
  let end = leaveDates.at(-1);
  while (isFreeDay(addDays(end, 1), leaveDates)) end = addDays(end, 1);
  return {
    start,
    end,
    totalDays: getDaysBetween(start, end),
    leaveDates,
    holidays: enumerateDates(start, end).filter((date) => holidayMap.has(date)).map((date) => `${date} ${holidayMap.get(date)}`),
  };
}

function formatGoldenPlans(plans, leaveDays, period) {
  if (plans.length === 0) return `${period.from}~${period.to} 기간에는 연차 ${leaveDays}개로 만들 수 있는 2일 이상 연휴가 없습니다.`;
  return [`연차 ${leaveDays}개 기준 최장 연휴 추천`, ...plans.map((plan, index) => formatPlan(plan, index + 1))].join("\n\n");
}

function formatHolidayList(from, to) {
  const items = holidays.filter(([date]) => date >= from && date <= to);
  if (items.length === 0) return `${from}~${to} 기간에 등록된 공휴일이 없습니다.`;
  return [`${from}~${to} 공휴일`, ...items.map(([date, name]) => `- ${formatDateKo(date)} ${name}`)].join("\n");
}

function formatPlan(plan, rank = 1) {
  if (!plan) return "연차 사용일을 1개 이상 입력해주세요.";
  return [
    `${rank}. ${formatDateKo(plan.start)}~${formatDateKo(plan.end)} ${plan.totalDays}일 휴무`,
    plan.leaveDates.length === 0 ? "연차 사용 없음" : `연차 ${plan.leaveDates.map(formatDateKo).join(", ")}`,
    plan.holidays.length > 0 ? `공휴일: ${plan.holidays.join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

function isFreeDay(date, leaveDates) {
  return isWeekend(date) || holidayMap.has(date) || leaveDates.includes(date);
}

function enumerateDates(from, to) {
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function addDays(date, days) {
  const value = parseIsoDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return formatIsoDate(value);
}

function getDaysBetween(start, end) {
  return Math.floor((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / 86400000) + 1;
}

function isWeekend(date) {
  const day = parseIsoDate(date).getUTCDay();
  return day === 0 || day === 6;
}

function formatDateKo(date) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}(${"일월화수목금토"[parseIsoDate(date).getUTCDay()]})`;
}

function todayIsoKst() {
  return formatIsoDate(new Date(Date.now() + 9 * 60 * 60 * 1000));
}

function parseIsoDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date) {
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
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
