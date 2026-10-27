import type { FastifyInstance } from 'fastify';
import { readServerConfig } from './config.js';

export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/** HTTP lifecycle; only the entrypoint should invoke this function. */
export async function listen(
  app: FastifyInstance,
  options: { shutdownTimeoutMs?: number } = {},
): Promise<string> {
  const shutdownTimeoutMs = options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;

  // Invalid configuration must release registered plugins and resources too.
  let config;
  try {
    config = readServerConfig();
  } catch (error) {
    await app.close();
    throw error;
  }

  let closing = false;
  async function shutdown(): Promise<void> {
    if (closing) return;
    closing = true;
    // A hung onClose hook or open handle must not keep the process alive forever.
    // Not unref'd: a close that never settles must still end with exit code 1.
    const forceExit = setTimeout(() => {
      process.exitCode = 1;
      process.exit();
    }, shutdownTimeoutMs);
    try {
      await app.close();
    } catch {
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExit);
    }
  }

  const onTerminate = (): void => {
    void shutdown();
  };
  const onInterrupt = (): void => {
    void shutdown();
  };

  // Remove the process-global handlers even if an embedding caller closes the
  // server directly; otherwise repeat startup/tests retain stale listeners.
  app.addHook('onClose', async () => {
    process.removeListener('SIGTERM', onTerminate);
    process.removeListener('SIGINT', onInterrupt);
  });
  process.once('SIGTERM', onTerminate);
  process.once('SIGINT', onInterrupt);
  try {
    const address = await app.listen({ host: config.host, port: config.port });
    return address;
  } catch (error) {
    await app.close();
    throw error;
  }
}
