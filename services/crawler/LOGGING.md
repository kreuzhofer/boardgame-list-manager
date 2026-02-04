# Crawler Service Logging

This document describes the logging implementation in the crawler service.

## Overview

The crawler service uses Winston for structured logging with JSON output in production and human-readable format in development.

## Configuration

Logging is configured via environment variables:

- `LOG_LEVEL`: Set the log level (default: `info`)
  - Options: `error`, `warn`, `info`, `debug`
- `NODE_ENV`: Set to `production` for JSON format, `development` for human-readable format

## Log Levels

- **error**: Critical errors that require attention
- **warn**: Warning conditions (validation failures, selector timeouts)
- **info**: General informational messages (startup, fetch requests, success)
- **debug**: Detailed debugging information (page context creation, browser reuse)

## Logged Events

### Service Startup
```json
{
  "level": "info",
  "message": "Starting crawler service...",
  "environment": "production",
  "port": "3001",
  "logLevel": "info",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:00:32.097Z"
}
```

### Browser Launch
```json
{
  "level": "info",
  "message": "Launching browser...",
  "config": {
    "headless": true,
    "args": ["--no-sandbox", "..."],
    "defaultViewport": {"width": 1920, "height": 1080}
  },
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:00:32.098Z"
}
```

### Browser Launch Success
```json
{
  "level": "info",
  "message": "Browser launched successfully",
  "version": "Chrome/143.0.7499.109",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:00:32.553Z"
}
```

### Browser Disconnection (Crash)
```json
{
  "level": "warn",
  "message": "Browser disconnected unexpectedly, will relaunch on next request",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:00:32.553Z"
}
```

### Fetch Request Started
```json
{
  "level": "info",
  "message": "Fetching page",
  "url": "https://example.com",
  "options": {"timeout": 30000},
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:01:16.676Z"
}
```

### Fetch Request Success
```json
{
  "level": "info",
  "message": "Successfully fetched page",
  "url": "https://example.com",
  "statusCode": 200,
  "loadTime": 2820,
  "htmlLength": 528,
  "finalUrl": "https://example.com/",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:01:19.510Z"
}
```

### Fetch Request Completed (Route Level)
```json
{
  "level": "info",
  "message": "Fetch request completed successfully",
  "requestId": "iv6a1k",
  "url": "https://example.com",
  "statusCode": 200,
  "loadTime": 2820,
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:01:19.510Z"
}
```

### Validation Error
```json
{
  "level": "warn",
  "message": "Request validation failed",
  "requestId": "m1uewi",
  "url": "invalid-url",
  "error": "Invalid URL format",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:01:42.021Z"
}
```

### Fetch Request Failed
```json
{
  "level": "error",
  "message": "Failed to fetch page",
  "url": "https://example.com",
  "errorType": "TIMEOUT",
  "errorMessage": "Page load timeout after 30000ms",
  "duration": 30123,
  "stack": "Error: Timeout...",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:01:42.021Z"
}
```

### Selector Not Found (Warning)
```json
{
  "level": "warn",
  "message": "Selector not found within timeout, returning HTML anyway",
  "url": "https://example.com",
  "selector": ".some-selector",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:01:42.021Z"
}
```

### Graceful Shutdown
```json
{
  "level": "info",
  "message": "Received SIGTERM, shutting down gracefully...",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:01:42.021Z"
}
```

### Uncaught Exception
```json
{
  "level": "error",
  "message": "Uncaught exception",
  "error": "Error message",
  "stack": "Error: ...",
  "service": "crawler-service",
  "timestamp": "2025-12-12T20:01:42.021Z"
}
```

## Request ID

Each fetch request is assigned a unique request ID for tracking across log entries. This helps correlate logs for a single request.

## Testing the Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### Fetch a Page
```bash
curl -X POST http://localhost:3001/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Viewing Logs

### Docker Compose
```bash
# View all logs
docker compose logs crawler

# Follow logs in real-time
docker compose logs -f crawler

# View last 50 lines
docker compose logs crawler --tail 50

# Filter by log level (requires jq)
docker compose logs crawler | grep '"level":"error"'
```

### Production
In production, logs are output as JSON to stdout and can be collected by log aggregation systems like:
- CloudWatch Logs
- Elasticsearch/Kibana
- Datadog
- Splunk

## Log Rotation

When running in production, use a log rotation solution:
- Docker's built-in log rotation
- External log collectors with rotation
- Syslog with logrotate

## Performance

Structured logging has minimal performance impact:
- JSON serialization is fast
- Logs are written asynchronously to stdout
- No file I/O overhead in the application
