import assert from "node:assert/strict";
import test from "node:test";
import { formatNeisError, NEIS_KEY_MESSAGE } from "../services/school/messages.js";

test("returns friendly NEIS API key message", () => {
  assert.equal(formatNeisError(new Error("NEIS_API_KEY_REQUIRED")), NEIS_KEY_MESSAGE);
});
