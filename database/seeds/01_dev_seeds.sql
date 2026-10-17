-- Development Seeds
-- Seed initial mock inquiries for local testing

INSERT INTO inquiries (id, name, email, company, service, message, status)
VALUES
    ('inq_demo_001', 'Elena Rostova', 'elena@acmebrand.com', 'Acme Brand Co.', 'brand-strategy', 'Looking for a complete brand redesign and 3D web experience.', 'new'),
    ('inq_demo_002', 'Marcus Vance', 'marcus@motionpulse.io', 'MotionPulse', 'creative-technology', 'Need an interactive Three.js product showcase.', 'contacted')
ON CONFLICT (id) DO NOTHING;
