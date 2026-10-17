-- 8Ball Studio Database Schema
-- Defines core entities for studio client inquiries, service catalog, and lead tracking.

CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    service TEXT DEFAULT 'general',
    message TEXT,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'in-review', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
