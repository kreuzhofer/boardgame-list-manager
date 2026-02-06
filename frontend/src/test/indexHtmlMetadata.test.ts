import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('index.html PWA metadata', () => {
  const currentFile = fileURLToPath(import.meta.url);
  const frontendRoot = path.resolve(path.dirname(currentFile), '..', '..');
  const indexHtmlPath = path.join(frontendRoot, 'index.html');

  it('declares an iOS home-screen icon and standalone mode metadata', () => {
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

    expect(indexHtml).toContain('rel="apple-touch-icon"');
    expect(indexHtml).toMatch(/href="\/[^"]+\.png"/);
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable" content="yes"');
  });
});
