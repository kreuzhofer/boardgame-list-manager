# Crawler Service

A lightweight, standalone Node.js microservice that provides a simple HTTP API for fetching web pages using a real headless Chromium browser via Puppeteer.

## Purpose

The crawler service acts as a "dumb fetcher" with no business logic, returning raw HTML content to the main application which performs all parsing and validation. It solves the problem of bot detection by websites like Amazon, which block standard HTTP requests but allow real browser traffic.

## Features

- Headless Chromium browser with Puppeteer
- Stealth plugin to avoid bot detection
- Simple REST API for page fetching
- Browser instance reuse for efficiency
- Configurable timeouts and wait conditions
- Health check endpoint
- Graceful error handling and fallback support

## Project Structure

```
services/crawler/
├── src/
│   ├── index.js           # Main entry point
│   ├── routes/            # API route handlers
│   ├── services/          # Core services (BrowserManager, PageFetcher)
│   └── utils/             # Utilities (RequestValidator)
├── package.json
├── .gitignore
└── README.md
```

## API Endpoints

### POST /fetch
Fetch a web page using the headless browser.

**Request:**
```json
{
  "url": "https://example.com",
  "options": {
    "timeout": 30000,
    "waitForSelector": ".content"
  }
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "html": "<html>...</html>",
  "headers": {},
  "url": "https://example.com",
  "loadTime": 1234
}
```

### GET /health
Check service health and browser status.

**Response:**
```json
{
  "status": "healthy",
  "browser": {
    "connected": true,
    "version": "120.0.0.0"
  },
  "uptime": 3600,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

## Docker

The service is designed to run in a Docker container. See the main project's docker-compose.yml for configuration.

## Environment Variables

- `CRAWLER_PORT` - Port to listen on (default: 3001)
- `NODE_ENV` - Environment (production/development)
- `LOG_LEVEL` - Logging level (info/debug/error)

## Requirements

See `.kiro/specs/browser-crawler-service/requirements.md` for detailed requirements.

## Design

See `.kiro/specs/browser-crawler-service/design.md` for architecture and design details.
