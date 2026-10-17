/**
 * FILE: backend/api/inquiries.test.js
 * PURPOSE: unit and contract tests for health check and inquiry validator
 * UI: None
 * USED BY: npm run test:all
 * KEY EXPORTS: None
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { validateInquiryPayload, formatApiResponse } from '@8ball/shared'
import { createInquiry, listInquiries } from '../services/inquiryService.js'

// Tests > Contracts > Shared: response envelope structure
test('formatApiResponse wraps payloads with timestamp and success status', () => {
  const result = formatApiResponse(true, { message: 'ok' })
  assert.equal(result.success, true)
  assert.equal(result.data.message, 'ok')
  assert.equal(result.error, null)
  assert.ok(result.timestamp)
})

// Tests > Validation > Inquiry: rejects missing name and malformed email
test('validateInquiryPayload catches invalid emails and missing required names', () => {
  const invalid = validateInquiryPayload({ name: '', email: 'not-an-email' })
  assert.equal(invalid.isValid, false)
  assert.equal(invalid.errors.length, 2)

  const valid = validateInquiryPayload({
    name: 'Jane Doe',
    email: 'jane@studio.co',
    service: 'motion-design',
  })
  assert.equal(valid.isValid, true)
  assert.equal(valid.errors.length, 0)
})

// Tests > Service > Inquiry: verifies in-memory persistence and status assignment
test('inquiryService stores records and defaults lifecycle status to new', async () => {
  const record = await createInquiry({
    name: 'Test Client',
    email: 'client@example.com',
    company: 'Studio X',
    service: 'creative-technology',
    message: 'Test message',
  })

  assert.ok(record.id.startsWith('inq_'))
  assert.equal(record.status, 'new')
  assert.equal(record.company, 'Studio X')

  const list = await listInquiries()
  assert.ok(list.some(item => item.id === record.id))
})
