import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function textResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

export function jsonTextResult(value: unknown): CallToolResult {
  return textResult(JSON.stringify(value, null, 2));
}

export function messageResult(lines: string[]): CallToolResult {
  return textResult(lines.filter(Boolean).join("\n"));
}
