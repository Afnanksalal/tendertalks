-- Add refund_status enum
DO $$ BEGIN
  CREATE TYPE "refund_status" AS ENUM('pending', 'approved', 'processed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update subscription_status enum to include pending_downgrade
ALTER TYPE "subscription_status" ADD VALUE IF NOT EXISTS 'pending_downgrade';

-- Add new columns to subscriptions table
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "razorpay_order_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "amount" decimal(10, 2);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'INR';
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pending_plan_id" uuid REFERENCES "pricing_plans"("id");

-- Create payment_history table
CREATE TABLE IF NOT EXISTS "payment_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" text NOT NULL,
  "amount" decimal(10, 2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'INR',
  "status" text NOT NULL DEFAULT 'pending',
  "razorpay_order_id" text,
  "razorpay_payment_id" text,
  "razorpay_signature" text,
  "metadata" text,
  "ref_id" uuid,
  "ref_type" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create refund_requests table
CREATE TABLE IF NOT EXISTS "refund_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "payment_history_id" uuid REFERENCES "payment_history"("id"),
  "subscription_id" uuid REFERENCES "subscriptions"("id"),
  "purchase_id" uuid REFERENCES "purchases"("id"),
  "amount" decimal(10, 2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'INR',
  "reason" text,
  "status" "refund_status" NOT NULL DEFAULT 'pending',
  "razorpay_refund_id" text,
  "processed_by" uuid REFERENCES "users"("id"),
  "processed_at" timestamp,
  "admin_notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_payment_history_user_id" ON "payment_history"("user_id");
CREATE INDEX IF NOT EXISTS "idx_payment_history_status" ON "payment_history"("status");
CREATE INDEX IF NOT EXISTS "idx_payment_history_ref" ON "payment_history"("ref_id", "ref_type");
CREATE INDEX IF NOT EXISTS "idx_refund_requests_user_id" ON "refund_requests"("user_id");
CREATE INDEX IF NOT EXISTS "idx_refund_requests_status" ON "refund_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_pending_plan" ON "subscriptions"("pending_plan_id");
