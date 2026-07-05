import { startMcpHttpServer } from "../shared/mcp-http.js";
import { createSchoolServer } from "./server.js";

startMcpHttpServer({
  serviceName: "school-life",
  createServer: createSchoolServer,
});
