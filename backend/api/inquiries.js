/**
 * FILE: backend/api/inquiries.js
 * PURPOSE: HTTP request handlers for inquiry creation and listing
 * UI: None
 * USED BY: backend/index.js
 * KEY EXPORTS: handleInquiriesRoute
 */

import { validateInquiryPayload, formatApiResponse } from '@8ball/shared'
import { createInquiry, listInquiries } from '../services/inquiryService.js'

// Helper reads raw stream chunks into parsed JSON
async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
      // 1MB cap prevents memory exhaustion DOS attacks
      if (body.length > 1e6) {
        req.destroy()
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      if (!body.trim()) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (err) {
        reject(new Error('Invalid JSON format'))
      }
    })
    req.on('error', reject)
  })
}

// Backend > API > Inquiries: router for /api/inquiries
export async function handleInquiriesRoute(req, res) {
  if (req.method === 'GET') {
    const list = await listInquiries()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(formatApiResponse(true, list)))
    return
  }

  if (req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const { isValid, errors } = validateInquiryPayload(body)

      if (!isValid) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(formatApiResponse(false, null, errors.join('; '))))
        return
      }

      const created = await createInquiry(body)
      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(formatApiResponse(true, created)))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(formatApiResponse(false, null, err.message)))
    }
    return
  }

  res.writeHead(405, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(formatApiResponse(false, null, 'Method not allowed')))
}
