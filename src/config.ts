export interface ServerConfig {
  host: '127.0.0.1' | 'localhost' | '0.0.0.0' | '::1' | '::';
  port: number;
}

const allowedHosts = new Set<ServerConfig['host']>([
  '127.0.0.1', 'localhost', '0.0.0.0', '::1', '::',
]);

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const host = env.HOST ?? '127.0.0.1';
  if (!allowedHosts.has(host as ServerConfig['host'])) {
    throw new Error('HOST must be localhost or a supported IP bind address');
  }

  const portText = env.PORT ?? '3000';
  if (!/^[0-9]+$/.test(portText)) {
    throw new Error('PORT must be a decimal integer from 0 to 65535');
  }
  const port = Number(portText);
  if (!Number.isSafeInteger(port) || port > 65535) {
    throw new Error('PORT must be a decimal integer from 0 to 65535');
  }

  return { host: host as ServerConfig['host'], port };
}
