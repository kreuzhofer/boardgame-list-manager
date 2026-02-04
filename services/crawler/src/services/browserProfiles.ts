export interface BrowserProfile {
  id: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  acceptLanguage: string;
  languages: string[];
  platform: string;
  vendor: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  timezone: string;
}

const profiles: BrowserProfile[] = [
  {
    id: 'win10-chrome120-1080p',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    acceptLanguage: 'en-US,en;q=0.9',
    languages: ['en-US', 'en'],
    platform: 'Win32',
    vendor: 'Google Inc.',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    timezone: 'America/New_York',
  },
  {
    id: 'win11-chrome121-768p',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768, deviceScaleFactor: 1 },
    acceptLanguage: 'en-US,en;q=0.8',
    languages: ['en-US', 'en'],
    platform: 'Win32',
    vendor: 'Google Inc.',
    hardwareConcurrency: 4,
    deviceMemory: 4,
    timezone: 'America/Chicago',
  },
  {
    id: 'mac13-chrome122-1050p',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1680, height: 1050, deviceScaleFactor: 2 },
    acceptLanguage: 'en-US,en;q=0.9',
    languages: ['en-US', 'en'],
    platform: 'MacIntel',
    vendor: 'Google Inc.',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'mac14-chrome123-900p',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    acceptLanguage: 'en-GB,en;q=0.9',
    languages: ['en-GB', 'en'],
    platform: 'MacIntel',
    vendor: 'Google Inc.',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    timezone: 'Europe/Berlin',
  },
  {
    id: 'linux-chrome120-900p',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
    acceptLanguage: 'en-US,en;q=0.9',
    languages: ['en-US', 'en'],
    platform: 'Linux x86_64',
    vendor: 'Google Inc.',
    hardwareConcurrency: 4,
    deviceMemory: 4,
    timezone: 'UTC',
  },
  {
    id: 'win10-chrome119-900p',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    viewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
    acceptLanguage: 'en-US,en;q=0.9',
    languages: ['en-US', 'en'],
    platform: 'Win32',
    vendor: 'Google Inc.',
    hardwareConcurrency: 6,
    deviceMemory: 8,
    timezone: 'America/Denver',
  },
];

let profileIndex = Math.floor(Math.random() * profiles.length);

export function getNextProfile(): BrowserProfile {
  const profile = profiles[profileIndex];
  profileIndex = (profileIndex + 1) % profiles.length;
  return profile;
}
