/**
 * FILE: backend/api/health.js
 * PURPOSE: liveness and readiness probe endpoint
 * UI: None
 * USED BY: backend/index.js, uptime monitors, Docker probes
 * KEY EXPORTS: handleHealthCheck
 */

import { formatApiResponse } from '@8ball/shared'

// Backend > API > Health: return service uptime and memory status
export function handleHealthCheck(req, res) {
  const payload = {
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(formatApiResponse(true, payload)))
}
