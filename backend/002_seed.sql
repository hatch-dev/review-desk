-- Users
-- Users
INSERT INTO users (id, name, email, password, role, company) VALUES
  -- Super Admin
  ('user-superadmin', 'Super Admin', 'superadmin@reviewdesk.local', 'superadmin123', 'super_admin', NULL),

  -- Admin
  ('user-admin', 'Admin Team', 'admin@reviewdesk.local', 'password', 'admin', NULL),

  -- Clients
  ('user-cognesense', 'Cognesense Client', 'client@cognesense.com', 'password', 'client', 'Cognesense'),
  ('user-northstar', 'Northstar Marketing', 'marketing@northstar.example', 'password', 'client', 'Northstar Labs')

ON CONFLICT (email) DO NOTHING;

-- Promotion Types
INSERT INTO promotion_types (id, name, description) VALUES
  ('social', 'Social Media Campaign', 'Banners, captions, and post creatives for social profiles.'),
  ('email',  'Email Campaign',        'PDF or image previews for email blast approvals.')
ON CONFLICT (id) DO NOTHING;

-- Clients
INSERT INTO clients (id, name, email, company) VALUES
  ('client-cognesense', 'Cognesense Client',   'client@cognesense.com',       'Cognesense'),
  ('client-northstar',  'Northstar Marketing', 'marketing@northstar.example', 'Northstar Labs')
ON CONFLICT (email) DO NOTHING;

-- Projects
INSERT INTO projects (id, name, client, owner, description, client_users, created_at) VALUES
  ('project-cognesense', 'Cognesense Projects',      'Cognesense',    'Growth Team',
   'Marketing approvals for social media and email campaigns.',
   ARRAY['client@cognesense.com'], '2026-04-10T09:30:00Z'),

  ('project-northstar',  'Northstar Product Rollout', 'Northstar Labs', 'Growth Team',
   'Launch promotions and lifecycle email assets.',
   ARRAY['marketing@northstar.example'], '2026-04-12T11:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Promotions (current_version_id set after versions below)
INSERT INTO promotions
  (id, project_id, title, type, scheduled_date, status, description,
   subject_line, contact_list, captions, created_at)
VALUES
  ('promo-ai-launch', 'project-cognesense', 'AI Workflow Launch', 'social',
   '2026-04-25', 'Pending Approval',
   'LinkedIn launch campaign for the new workflow automation feature.',
   '', '',
   ARRAY[
     'Cognesense teams can now review complex project signals in one streamlined approval workspace.',
     'Launch faster with one place for context, comments, versions, and final sign-off.'
   ], '2026-04-17T10:30:00Z'),

  ('promo-newsletter', 'project-cognesense', 'April Product Newsletter', 'email',
   '2026-04-28', 'Revision Required',
   'Monthly product update email with customer story and feature highlights.',
   'April product updates from Cognesense', 'Cognesense newsletter subscribers',
   '{}', '2026-04-18T12:15:00Z'),

  ('promo-webinar', 'project-cognesense', 'Customer Webinar Reminder', 'social',
   '2026-05-02', 'Draft',
   'Reminder banner and short caption set for the upcoming webinar.',
   '', '',
   ARRAY['Reserve your seat for Cognesense Live: practical strategies for faster project approvals.'],
   '2026-04-19T08:30:00Z'),

  ('promo-northstar-drip', 'project-northstar', 'Beta Invite Drip', 'email',
   '2026-04-30', 'Approved',
   'Three-part beta invitation sequence.',
   'Your Northstar beta invitation', 'Northstar beta waitlist',
   '{}', '2026-04-14T15:45:00Z')
ON CONFLICT (id) DO NOTHING;

-- Versions
INSERT INTO versions (id, promotion_id, version, label, file_name, file_type, uploaded_by, uploaded_at, url, notes) VALUES
  ('ver-ai-launch-1',   'promo-ai-launch',      1, 'Initial banner concept', 'launch-banner-v1.png',        'image', 'Admin', '2026-04-17T10:45:00Z', '/uploads/placeholder.png', 'First layout with launch headline.'),
  ('ver-ai-launch-2',   'promo-ai-launch',      2, 'Updated CTA',            'launch-banner-v2.png',        'image', 'Admin', '2026-04-19T16:10:00Z', '/uploads/placeholder.png', 'Adjusted call to action and typography.'),
  ('ver-newsletter-1',  'promo-newsletter',     1, 'PDF email preview',      'april-newsletter-preview.pdf','pdf',   'Admin', '2026-04-18T12:40:00Z', '/uploads/placeholder.pdf', 'Email design exported as PDF.'),
  ('ver-webinar-1',     'promo-webinar',        1, 'Draft creative',         'webinar-reminder.png',        'image', 'Admin', '2026-04-19T09:00:00Z', '/uploads/placeholder.png', 'Draft for internal review.'),
  ('ver-northstar-1',   'promo-northstar-drip', 1, 'Approved PDF',           'beta-invite.pdf',             'pdf',   'Admin', '2026-04-15T11:00:00Z', '/uploads/placeholder.pdf', 'Client approved.')
ON CONFLICT (id) DO NOTHING;

-- Set current_version_id on promotions
UPDATE promotions SET current_version_id = 'ver-ai-launch-2'  WHERE id = 'promo-ai-launch'      AND current_version_id IS NULL;
UPDATE promotions SET current_version_id = 'ver-newsletter-1' WHERE id = 'promo-newsletter'     AND current_version_id IS NULL;
UPDATE promotions SET current_version_id = 'ver-webinar-1'    WHERE id = 'promo-webinar'        AND current_version_id IS NULL;
UPDATE promotions SET current_version_id = 'ver-northstar-1'  WHERE id = 'promo-northstar-drip' AND current_version_id IS NULL;

-- Comments
INSERT INTO comments (id, promotion_id, author, role, body, created_at) VALUES
  ('comment-1', 'promo-ai-launch',  'Client', 'client', 'The layout works. Can we make the CTA feel more action-oriented?',       '2026-04-19T09:22:00Z'),
  ('comment-2', 'promo-ai-launch',  'Admin',  'admin',  'Updated in version 2 with a stronger CTA and cleaner hierarchy.',        '2026-04-19T16:12:00Z'),
  ('comment-3', 'promo-newsletter', 'Client', 'client', 'Please move the customer quote higher and shorten the intro paragraph.', '2026-04-20T13:04:00Z')
ON CONFLICT (id) DO NOTHING;
