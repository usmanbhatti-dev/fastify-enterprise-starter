import 'dotenv/config';

import { setTimeout, clearTimeout } from 'node:timers';
import { initTelemetry, shutdownTelemetry } from './hooks/telemetry.hook.js';
import { startApp, buildApp } from './app.js';
import { disconnectDatabase } from './database/index.js';
import { disconnectRedis } from './cache/index.js';
import type { FastifyInstance } from 'fastify';

initTelemetry();

const SHUTDOWN_TIMEOUT_MS = 30_000;

let app: FastifyInstance | null = null;
let isShuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  const forceExitTimer = setTimeout(() => {
    process.stderr.write('Shutdown timeout reached, forcing exit...\n');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  try {
    process.stderr.write(`Received ${signal}, shutting down gracefully...\n`);

    if (app) {
      await app.close();
      app = null;
    }

    await shutdownTelemetry();
    process.exit(exitCode);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  } finally {
    clearTimeout(forceExitTimer);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  void shutdown('uncaughtException', 1);
});

async function main(): Promise<void> {
  try {
    app = await startApp();
  } catch (error) {
    console.error('Failed to start server:', error);
    await disconnectDatabase().catch(() => undefined);
    await disconnectRedis().catch(() => undefined);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { buildApp };
