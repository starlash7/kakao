import { getTodayIsoKst } from "../shared/date.js";

type PeriodInput = {
  year?: number;
  month?: number;
  from?: string;
  to?: string;
};

export function resolvePeriod(input: PeriodInput) {
  if (input.from || input.to) {
    return {
      from: input.from ?? getTodayIsoKst(),
      to: input.to ?? "2026-12-31",
    };
  }

  if (input.year && input.month) {
    const lastDay = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
    return {
      from: `${input.year}-${String(input.month).padStart(2, "0")}-01`,
      to: `${input.year}-${String(input.month).padStart(2, "0")}-${lastDay}`,
    };
  }

  if (input.year) {
    return {
      from: `${input.year}-01-01`,
      to: `${input.year}-12-31`,
    };
  }

  return {
    from: getTodayIsoKst(),
    to: "2026-12-31",
  };
}
