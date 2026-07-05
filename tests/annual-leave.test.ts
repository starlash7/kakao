import assert from "node:assert/strict";
import test from "node:test";
import { checkLeavePlan, findGoldenHolidays } from "../services/annual-leave/leave-calculator.js";

test("finds 2026 October 9-day golden holiday with 3 leave days", () => {
  const plans = findGoldenHolidays("2026-10-01", "2026-10-31", 3);
  const topPlan = plans[0];

  assert.equal(topPlan.start, "2026-10-03");
  assert.equal(topPlan.end, "2026-10-11");
  assert.equal(topPlan.totalDays, 9);
  assert.deepEqual(topPlan.leaveDates, ["2026-10-06", "2026-10-07", "2026-10-08"]);
});

test("supports zero leave days for natural holidays", () => {
  const plans = findGoldenHolidays("2026-12-01", "2026-12-31", 0);
  assert.equal(plans[0].start, "2026-12-25");
  assert.equal(plans[0].end, "2026-12-27");
  assert.equal(plans[0].totalDays, 3);
});

test("checks concrete leave plan duration", () => {
  const plan = checkLeavePlan(["2026-10-06", "2026-10-07", "2026-10-08"]);

  assert.equal(plan?.start, "2026-10-03");
  assert.equal(plan?.end, "2026-10-11");
  assert.equal(plan?.totalDays, 9);
});
