/**
 * FILE: shared/src/index.js
 * PURPOSE: shared data contracts, schemas, constants between frontend and backend
 * UI: None
 * USED BY: frontend, backend
 * KEY EXPORTS: STUDIO_SERVICES, INQUIRY_STATUSES, validateInquiryPayload, formatApiResponse
 */

// Shared > Constants > Services: supported studio production domains
export const STUDIO_SERVICES = [
  'brand-strategy',
  'motion-design',
  'video-production',
  'creative-technology',
  'ai-generation',
]

// Shared > Constants > Statuses: lifecycle stages for studio client leads
export const INQUIRY_STATUSES = [
  'new',
  'contacted',
  'in-review',
  'archived',
]

// Shared > Contracts > Response: standard API response shape
export function formatApiResponse(success, data = null, error = null) {
  return {
    success: Boolean(success),
    data,
    error: error ? String(error) : null,
    timestamp: new Date().toISOString(),
  }
}

// Shared > Contracts > Validation: payload validator for client inquiry forms
export function validateInquiryPayload(payload = {}) {
  const errors = []

  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
    errors.push('Name is required')
  }

  // Regex checks basic email pattern before hitting database or email providers
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!payload.email || typeof payload.email !== 'string' || !emailRegex.test(payload.email.trim())) {
    errors.push('Valid email is required')
  }

  if (payload.service && !STUDIO_SERVICES.includes(payload.service)) {
    errors.push(`Invalid service. Expected one of: ${STUDIO_SERVICES.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
