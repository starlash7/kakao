import cors from "cors";
import express, { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

type CreateMcpServer = () => McpServer;

type StartOptions = {
  serviceName: string;
  createServer: CreateMcpServer;
};

type TransportMap = Record<string, StreamableHTTPServerTransport>;

export function startMcpHttpServer(options: StartOptions) {
  const port = Number(process.env.PORT ?? process.env.MCP_PORT ?? 3000);
  const app = express();
  const transports: TransportMap = {};

  app.use(express.json());
  app.use(cors({ origin: "*", exposedHeaders: ["Mcp-Session-Id"] }));

  const health = (_req: Request, res: Response) => {
    res.json({ ok: true, service: options.serviceName });
  };

  app.get("/", health);
  app.get("/health", health);

  app.post("/mcp", async (req, res) => {
    await handleMcpPost(req, res, transports, options.createServer);
  });

  app.get("/mcp", async (req, res) => {
    await handleSessionRequest(req, res, transports, "Invalid or missing session ID");
  });

  app.delete("/mcp", async (req, res) => {
    await handleSessionRequest(req, res, transports, "Invalid or missing session ID");
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`${options.serviceName} MCP server listening on ${port}`);
  });
}

async function handleMcpPost(
  req: Request,
  res: Response,
  transports: TransportMap,
  createServer: CreateMcpServer,
) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports[newSessionId] = transport;
        },
      });

      transport.onclose = () => {
        const closedSessionId = transport.sessionId;
        if (closedSessionId) {
          delete transports[closedSessionId];
        }
      };

      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: no valid session" },
      id: null,
    });
  } catch (error) {
    console.error("MCP request failed:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}

async function handleSessionRequest(
  req: Request,
  res: Response,
  transports: TransportMap,
  errorMessage: string,
) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send(errorMessage);
    return;
  }

  await transports[sessionId].handleRequest(req, res);
}
