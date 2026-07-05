import { startMcpHttpServer } from "../shared/mcp-http.js";
import { createAnnualLeaveServer } from "./server.js";

startMcpHttpServer({
  serviceName: "annual-leave",
  createServer: createAnnualLeaveServer,
});
