type NeisParams = Record<string, string | number | undefined>;

export type SchoolInfo = {
  officeCode: string;
  officeName: string;
  schoolCode: string;
  schoolName: string;
  schoolType: string;
  region: string;
  address: string;
};

export type MealInfo = {
  mealName: string;
  date: string;
  dishes: string[];
  calories?: string;
};

export type ScheduleInfo = {
  date: string;
  name: string;
  type?: string;
};

export type TimetableInfo = {
  period: string;
  subject: string;
};

const BASE_URL = "https://open.neis.go.kr/hub";
const TIMEOUT_MS = 5000;
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

export async function searchSchool(schoolName: string, region?: string) {
  const regionName = normalizeRegionName(region);

  for (const term of getSchoolSearchTerms(schoolName)) {
    const rows = await fetchNeisRows("schoolInfo", {
      SCHUL_NM: term,
      LCTN_SC_NM: regionName,
      pSize: 5,
    });

    if (rows.length > 0) {
      return rows.map((row): SchoolInfo => ({
        officeCode: stringValue(row.ATPT_OFCDC_SC_CODE),
        officeName: stringValue(row.ATPT_OFCDC_SC_NM),
        schoolCode: stringValue(row.SD_SCHUL_CODE),
        schoolName: stringValue(row.SCHUL_NM),
        schoolType: stringValue(row.SCHUL_KND_SC_NM),
        region: stringValue(row.LCTN_SC_NM),
        address: stringValue(row.ORG_RDNMA),
      }));
    }
  }

  return [];
}

export function normalizeRegionName(region?: string) {
  const trimmed = region?.trim();
  if (!trimmed) return undefined;
  return REGION_ALIASES.get(trimmed) ?? trimmed;
}

export function getSchoolSearchTerms(schoolName: string) {
  const trimmed = schoolName.trim();
  if (!trimmed) return [];

  return unique([
    trimmed,
    trimmed.replace(/초등학교$/, "초"),
    trimmed.replace(/중학교$/, "중"),
    trimmed.replace(/고등학교$/, "고"),
    trimmed.replace(/외고$/, "외국어고등학교"),
  ]);
}

export async function getMeal(officeCode: string, schoolCode: string, date: string) {
  const rows = await fetchNeisRows("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
    MLSV_YMD: date,
  });

  return rows.map((row): MealInfo => ({
    mealName: stringValue(row.MMEAL_SC_NM),
    date: stringValue(row.MLSV_YMD),
    dishes: cleanDishNames(stringValue(row.DDISH_NM)),
    calories: stringValue(row.CAL_INFO),
  }));
}

export async function getSchedule(officeCode: string, schoolCode: string, from: string, to: string) {
  const rows = await fetchNeisRows("SchoolSchedule", {
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
    AA_FROM_YMD: from,
    AA_TO_YMD: to,
    pSize: 100,
  });

  return rows.map((row): ScheduleInfo => ({
    date: stringValue(row.AA_YMD),
    name: stringValue(row.EVENT_NM),
    type: stringValue(row.SBTR_DD_SC_NM),
  }));
}

export async function getTimetable(
  officeCode: string,
  schoolCode: string,
  schoolType: string,
  grade: string,
  className: string,
  date: string,
) {
  const rows = await fetchNeisRows(getTimetableEndpoint(schoolType), {
    ATPT_OFCDC_SC_CODE: officeCode,
    SD_SCHUL_CODE: schoolCode,
    ALL_TI_YMD: date,
    GRADE: grade,
    CLASS_NM: className,
    pSize: 30,
  });

  return rows
    .map((row): TimetableInfo => ({
      period: stringValue(row.PERIO),
      subject: stringValue(row.ITRT_CNTNT),
    }))
    .filter((item) => item.period || item.subject);
}

export function hasNeisKey() {
  return Boolean(process.env.NEIS_API_KEY);
}

async function fetchNeisRows(endpoint: string, params: NeisParams) {
  const key = process.env.NEIS_API_KEY;

  const url = new URL(`${BASE_URL}/${endpoint}`);
  if (key) {
    url.searchParams.set("KEY", key);
  }
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(name, String(value));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    return extractRows(endpoint, data);
  } finally {
    clearTimeout(timeout);
  }
}

function extractRows(endpoint: string, data: unknown) {
  if (!data || typeof data !== "object") {
    return [];
  }

  const body = data as Record<string, unknown>;
  const items = body[endpoint];
  if (!Array.isArray(items)) {
    return [];
  }

  const rowBlock = items.find((item) => {
    return Boolean(item && typeof item === "object" && "row" in item);
  }) as { row?: Record<string, unknown>[] } | undefined;

  return rowBlock?.row ?? [];
}

export function getTimetableEndpoint(schoolType: string) {
  const normalized = schoolType.trim().toLowerCase();
  if (normalized.includes("초") || normalized === "elementary") return "elsTimetable";
  if (normalized.includes("중") || normalized === "middle") return "misTimetable";
  return "hisTimetable";
}

function cleanDishNames(value: string) {
  return value
    .replaceAll("<br/>", "\n")
    .split("\n")
    .map((item) => item.replace(/\s*\([0-9.]+\)\s*/g, "").trim())
    .filter(Boolean);
}

function stringValue(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
