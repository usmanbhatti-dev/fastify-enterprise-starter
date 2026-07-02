import 'dotenv/config';

import { initTelemetry, shutdownTelemetry } from './hooks/telemetry.hook.js';
import { startApp, buildApp } from './app.js';
import { disconnectDatabase } from './database/index.js';
import { disconnectRedis } from './cache/index.js';
import type { FastifyInstance } from 'fastify';

initTelemetry();

let app: FastifyInstance | null = null;

async function shutdown(signal: string): Promise<void> {
  process.stderr.write(`Received ${signal}, shutting down gracefully...\n`);

  if (app) {
    await app.close();
  }

  await disconnectDatabase();
  await disconnectRedis();
  await shutdownTelemetry();

  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

async function main(): Promise<void> {
  app = await startApp();
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { buildApp };
