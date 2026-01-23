#!/usr/bin/env node
/**
 * BGG Image Scraping Test Script
 * Tests extracting game thumbnails from BoardGameGeek pages
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/tmp/bgg-images';

// Test games with their BGG IDs
const TEST_GAMES = [
  { id: 174430, name: 'Gloomhaven' },
  { id: 167791, name: 'Terraforming Mars' },
  { id: 224517, name: 'Brass Birmingham' },
  { id: 342942, name: 'Ark Nova' },
  { id: 291457, name: 'Gloomhaven Jaws of the Lion' },
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    };
    
    https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect - handle relative URLs
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `https://${parsedUrl.hostname}${redirectUrl}`;
        }
        fetchPage(redirectUrl).then(resolve).catch(reject);
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(filepath);
        downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

function extractImageUrls(html) {
  const result = {
    ogImage: null,
    preloadImage: null,
    geekitemImages: null,
  };
  
  // Method 1: og:image meta tag (easiest, always present)
  const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (ogMatch) {
    result.ogImage = ogMatch[1];
  }
  
  // Method 2: preload link for itemrep image
  const preloadMatch = html.match(/<link\s+rel="preload"\s+as="image"\s+href="([^"]+__itemrep[^"]+)"/);
  if (preloadMatch) {
    result.preloadImage = preloadMatch[1];
  }
  
  // Method 3: Extract from GEEK.geekitemPreload JSON
  const geekitemMatch = html.match(/GEEK\.geekitemPreload\s*=\s*(\{[\s\S]*?\});[\s\n]*GEEK\.geekitemSettings/);
  if (geekitemMatch) {
    try {
      const geekitem = JSON.parse(geekitemMatch[1]);
      if (geekitem.item?.images) {
        result.geekitemImages = geekitem.item.images;
      }
    } catch (e) {
      console.log('  Failed to parse geekitem JSON:', e.message);
    }
  }
  
  return result;
}

async function testGame(game) {
  console.log(`\n=== Testing: ${game.name} (ID: ${game.id}) ===`);
  
  const url = `https://boardgamegeek.com/boardgame/${game.id}`;
  console.log(`Fetching: ${url}`);
  
  try {
    const html = await fetchPage(url);
    console.log(`  Page size: ${(html.length / 1024).toFixed(1)} KB`);
    
    const images = extractImageUrls(html);
    
    console.log('\n  Image URLs found:');
    if (images.ogImage) {
      console.log(`  - og:image: ${images.ogImage.substring(0, 80)}...`);
    }
    if (images.preloadImage) {
      console.log(`  - preload: ${images.preloadImage.substring(0, 80)}...`);
    }
    if (images.geekitemImages) {
      console.log('  - geekitem images:');
      for (const [key, value] of Object.entries(images.geekitemImages)) {
        if (typeof value === 'string') {
          console.log(`    ${key}: ${value.substring(0, 60)}...`);
        }
      }
    }
    
    // Download the thumbnail (square200 is good for our use case)
    if (images.geekitemImages?.square200) {
      const thumbUrl = images.geekitemImages.square200;
      const filename = `${game.id}-${game.name.replace(/[^a-z0-9]/gi, '_')}-square200.jpg`;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      console.log(`\n  Downloading thumbnail to: ${filepath}`);
      await downloadImage(thumbUrl, filepath);
      
      const stats = fs.statSync(filepath);
      console.log(`  Downloaded: ${(stats.size / 1024).toFixed(1)} KB`);
    }
    
    // Also download micro (64x64) for comparison
    if (images.geekitemImages?.micro) {
      const microUrl = images.geekitemImages.micro;
      const filename = `${game.id}-${game.name.replace(/[^a-z0-9]/gi, '_')}-micro.jpg`;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      await downloadImage(microUrl, filepath);
      const stats = fs.statSync(filepath);
      console.log(`  Micro (64x64): ${(stats.size / 1024).toFixed(1)} KB`);
    }
    
    return images;
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('BGG Image Scraping Test');
  console.log('=======================\n');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log(`Output directory: ${OUTPUT_DIR}`);
  
  for (const game of TEST_GAMES) {
    await testGame(game);
    // Small delay between requests to be polite
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n\n=== Summary ===');
  console.log(`Images saved to: ${OUTPUT_DIR}`);
  
  const files = fs.readdirSync(OUTPUT_DIR);
  console.log(`\nDownloaded files:`);
  for (const file of files) {
    const stats = fs.statSync(path.join(OUTPUT_DIR, file));
    console.log(`  ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  }
}

main().catch(console.error);
