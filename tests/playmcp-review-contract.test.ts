import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import test from "node:test";

type Tool = {
  name: string;
  description: string;
  annotations?: Record<string, unknown>;
  inputSchema: {
    properties?: Record<string, { description?: string }>;
  };
};

test("annual leave tools satisfy PlayMCP review contract", async () => {
  const server = await startServer("deploy/annual-leave-server.mjs", 3501);
  try {
    const tools = await listTools("http://localhost:3501/mcp");
    assert.equal(tools.length, 3);
    assertToolsValid(tools, "연차 마법사", false);
  } finally {
    server.kill();
  }
});

test("school tools satisfy PlayMCP review contract", async () => {
  const server = await startServer("deploy/school-server.mjs", 3502);
  try {
    const tools = await listTools("http://localhost:3502/mcp");
    assert.equal(tools.length, 4);
    assertToolsValid(tools, "우리 아이 학교", true);
  } finally {
    server.kill();
  }
});

function assertToolsValid(tools: Tool[], serviceName: string, openWorldHint: boolean) {
  for (const tool of tools) {
    assert.match(tool.description, new RegExp(serviceName), `${tool.name} description must include service name`);
    assert.ok(tool.annotations, `${tool.name} annotations must exist`);
    assert.equal(typeof tool.annotations.title, "string", `${tool.name} annotations.title must exist`);
    assert.equal(tool.annotations.readOnlyHint, true, `${tool.name} must be read-only`);
    assert.equal(tool.annotations.destructiveHint, false, `${tool.name} must be non-destructive`);
    assert.equal(tool.annotations.idempotentHint, true, `${tool.name} must be idempotent`);
    assert.equal(tool.annotations.openWorldHint, openWorldHint, `${tool.name} openWorldHint mismatch`);

    for (const [name, property] of Object.entries(tool.inputSchema.properties ?? {})) {
      assert.equal(typeof property.description, "string", `${tool.name}.${name} description must exist`);
      assert.notEqual(property.description?.trim(), "", `${tool.name}.${name} description must not be empty`);
    }
  }
}

async function startServer(path: string, port: number) {
  const child = spawn(process.execPath, [path], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await waitForHealth(port, child);
  return child;
}

async function waitForHealth(port: number, child: ChildProcess) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`server on ${port} did not become healthy`);
}

async function listTools(endpoint: string) {
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  const init = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "contract-test", version: "0.1.0" },
      },
    }),
  });

  const sessionId = init.headers.get("mcp-session-id");
  await init.text();

  const sessionHeaders = { ...headers, "mcp-session-id": sessionId ?? "" };
  await fetch(endpoint, {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  });

  const data = parseSse(await response.text());
  return data.result.tools as Tool[];
}

function parseSse(text: string) {
  const line = text.split("\n").find((item) => item.startsWith("data: "));
  assert.ok(line, "SSE data line must exist");
  return JSON.parse(line.slice("data: ".length));
}
