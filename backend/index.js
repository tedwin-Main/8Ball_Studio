/**
 * FILE: backend/index.js
 * PURPOSE: main server entry point, CORS configuration, request routing
 * UI: None
 * USED BY: backend process runner, Docker entrypoint
 * KEY EXPORTS: server
 */

import http from 'node:http'
import { handleHealthCheck } from './api/health.js'
import { handleInquiriesRoute } from './api/inquiries.js'

const PORT = process.env.PORT || 3001

// Backend > Server > Core: dispatch incoming HTTP requests
export const server = http.createServer(async (req, res) => {
  // CORS headers permit local Vite dev origin requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Pre-flight check response
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/api/health') {
    return handleHealthCheck(req, res)
  }

  if (url.pathname === '/api/inquiries') {
    return handleInquiriesRoute(req, res)
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Endpoint not found' }))
})

// Run engine: boot server when launched as main script
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[8Ball Backend] running on http://localhost:${PORT}`)
  })
}
