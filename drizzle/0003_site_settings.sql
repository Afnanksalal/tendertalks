-- Site Settings / Feature Toggles
CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL UNIQUE,
  "value" text NOT NULL,
  "description" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id")
);

-- Insert default feature toggles
INSERT INTO "site_settings" ("key", "value", "description") VALUES
  ('feature_blog', 'true', 'Enable/disable blog section'),
  ('feature_merch', 'true', 'Enable/disable merchandise store'),
  ('feature_subscriptions', 'true', 'Enable/disable subscription plans'),
  ('feature_downloads', 'true', 'Enable/disable podcast downloads'),
  ('feature_newsletter', 'true', 'Enable/disable newsletter signup'),
  ('site_name', 'TenderTalks', 'Site name'),
  ('site_tagline', 'AI, Tech & Human Connection', 'Site tagline'),
  ('maintenance_mode', 'false', 'Enable maintenance mode')
ON CONFLICT ("key") DO NOTHING;
