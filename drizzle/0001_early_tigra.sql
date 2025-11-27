DO $$ BEGIN
 CREATE TYPE "public"."refund_status" AS ENUM('pending', 'approved', 'processed', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "subscription_status" ADD VALUE 'pending_downgrade';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"razorpay_signature" text,
	"metadata" text,
	"ref_id" uuid,
	"ref_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refund_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"payment_history_id" uuid,
	"subscription_id" uuid,
	"purchase_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"reason" text,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"razorpay_refund_id" text,
	"processed_by" uuid,
	"processed_at" timestamp,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "razorpay_order_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "currency" text DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pending_plan_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_payment_history_id_payment_history_id_fk" FOREIGN KEY ("payment_history_id") REFERENCES "public"."payment_history"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pending_plan_id_pricing_plans_id_fk" FOREIGN KEY ("pending_plan_id") REFERENCES "public"."pricing_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
