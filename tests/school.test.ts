import assert from "node:assert/strict";
import test from "node:test";
import { formatNeisError, formatTimetable, NEIS_KEY_MESSAGE } from "../services/school/messages.js";
import { getSchoolSearchTerms, getTimetableEndpoint, normalizeRegionName } from "../services/school/neis-client.js";

test("returns friendly NEIS API key message", () => {
  assert.equal(formatNeisError(new Error("NEIS_API_KEY_REQUIRED")), NEIS_KEY_MESSAGE);
});

test("normalizes common region aliases for NEIS school search", () => {
  assert.equal(normalizeRegionName("서울"), "서울특별시");
  assert.equal(normalizeRegionName("서울시"), "서울특별시");
  assert.equal(normalizeRegionName("서울특별시"), "서울특별시");
});

test("adds review-friendly school name fallbacks", () => {
  assert.deepEqual(getSchoolSearchTerms("서울초등학교"), ["서울초등학교", "서울초"]);
  assert.deepEqual(getSchoolSearchTerms(" 서울대치초등학교 "), ["서울대치초등학교", "서울대치초"]);
  assert.deepEqual(getSchoolSearchTerms("한영외고"), ["한영외고", "한영외국어고등학교"]);
});

test("selects the correct NEIS timetable API for Korean and English school types", () => {
  assert.equal(getTimetableEndpoint("초등학교"), "elsTimetable");
  assert.equal(getTimetableEndpoint("elementary"), "elsTimetable");
  assert.equal(getTimetableEndpoint("중학교"), "misTimetable");
  assert.equal(getTimetableEndpoint("middle"), "misTimetable");
  assert.equal(getTimetableEndpoint("고등학교"), "hisTimetable");
  assert.equal(getTimetableEndpoint("high"), "hisTimetable");
});

test("explains why weekend timetable data is unavailable", () => {
  assert.equal(
    formatTimetable([], "20260711", "3", "2"),
    "2026-07-11은 주말이라 시간표가 없습니다. 다음 등교일을 지정해 다시 조회해주세요.",
  );
});
