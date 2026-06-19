import app from "./app";
import { logger } from "./lib/logger";
import { startBot, stopBot } from "./bot/bot";
import { validateConfig } from "./bot/config";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// Arrancar el bot de Discord
try {
  validateConfig();
  startBot().catch((err) => {
    logger.error({ err }, "Discord bot failed to start");
  });
} catch (err) {
  logger.error({ err }, "Discord bot config invalid — bot not started");
}

// Apagado graceful
process.on("SIGTERM", async () => {
  await stopBot();
  process.exit(0);
});
