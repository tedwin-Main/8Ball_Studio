/**
 * FILE: backend/services/inquiryService.js
 * PURPOSE: business logic and storage handling for studio project inquiries
 * UI: None
 * USED BY: backend/api/inquiries.js
 * KEY EXPORTS: createInquiry, listInquiries
 */

// In-memory inquiry store for local dev fallback when DB is disconnected
const inquiriesStore = []

// Backend > Service > Inquiry: save new client inquiry
export async function createInquiry(payload) {
  const record = {
    id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: payload.name.trim(),
    email: payload.email.trim(),
    company: payload.company ? payload.company.trim() : null,
    service: payload.service || 'general',
    message: payload.message ? payload.message.trim() : '',
    status: 'new',
    createdAt: new Date().toISOString(),
  }

  inquiriesStore.push(record)
  return record
}

// Backend > Service > Inquiry: fetch all saved inquiries
export async function listInquiries() {
  return [...inquiriesStore]
}
