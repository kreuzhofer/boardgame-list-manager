export interface ProxyConfig {
  server: string;
  username: string;
  password: string;
}

const DEFAULT_PROXY_HOST = 'proxy.apify.com';
const DEFAULT_PROXY_PORT = '8000';
let proxyDisabledForSession = false;

function buildUsername(): string {
  const explicitUsername = process.env.APIFY_PROXY_USERNAME;
  if (explicitUsername && explicitUsername.trim().length > 0) {
    return explicitUsername.trim();
  }

  const groups = (process.env.APIFY_PROXY_GROUPS || '').trim();
  const country = (process.env.APIFY_PROXY_COUNTRY || '').trim();
  const session = (process.env.APIFY_PROXY_SESSION || '').trim();
  const parts: string[] = [];

  if (groups) {
    const normalizedGroups = groups.startsWith('groups-') ? groups.slice('groups-'.length) : groups;
    parts.push(`groups-${normalizedGroups}`);
  }

  if (country) {
    parts.push(`country-${country.toUpperCase()}`);
  }

  if (session) {
    parts.push(`session-${session}`);
  }

  if (parts.length === 0) {
    return 'auto';
  }

  return parts.join(',');
}

export function getProxyConfig(): ProxyConfig | null {
  if (proxyDisabledForSession) {
    return null;
  }

  const password = (process.env.APIFY_PROXY_PASSWORD || '').trim();
  if (!password) {
    return null;
  }

  const host = (process.env.APIFY_PROXY_HOSTNAME || DEFAULT_PROXY_HOST).trim();
  const port = (process.env.APIFY_PROXY_PORT || DEFAULT_PROXY_PORT).trim();

  return {
    server: `http://${host}:${port}`,
    username: buildUsername(),
    password,
  };
}

export function disableProxyForSession(): void {
  proxyDisabledForSession = true;
}

export function isProxyDisabledForSession(): boolean {
  return proxyDisabledForSession;
}
