import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

let server = null;

function shutdown(signal) {
  if (!server) {
    process.exit(0);
    return;
  }
  console.log(`\n${signal}: closing HTTP server…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.on(signal, () => shutdown(signal));
}

async function start() {
  await connectDatabase();
  const app = createApp();
  server = app.listen(env.port, () => {
    console.log(
      `Complete Home API running on http://localhost:${env.port}/api/v1`,
    );
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPort ${env.port} is already in use. Stop the other process:\n  fuser -k ${env.port}/tcp\n  # or: lsof -i :${env.port} then kill <PID>\n`,
      );
      process.exit(1);
    }
    throw err;
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
