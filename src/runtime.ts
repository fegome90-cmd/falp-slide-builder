import type { FastifyInstance } from 'fastify';
import { readServerConfig } from './config.js';

/** HTTP lifecycle; only the entrypoint should invoke this function. */
export async function listen(app: FastifyInstance): Promise<string> {
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
    try {
      await app.close();
    } catch {
      process.exitCode = 1;
    }
  }

  const onTerminate = (): void => { void shutdown(); };
  const onInterrupt = (): void => { void shutdown(); };

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
    console.log('KIT_LISTEN ' + address);
    return address;
  } catch (error) {
    await app.close();
    throw error;
  }
}
