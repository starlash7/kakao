import assert from "node:assert/strict";
import test from "node:test";
import { formatNeisError, NEIS_KEY_MESSAGE } from "../services/school/messages.js";
import { getSchoolSearchTerms, normalizeRegionName } from "../services/school/neis-client.js";

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
