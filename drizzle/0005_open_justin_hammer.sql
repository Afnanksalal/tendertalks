CREATE INDEX IF NOT EXISTS "downloads_user_id_idx" ON "downloads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "downloads_podcast_id_idx" ON "downloads" USING btree ("podcast_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merch_order_items_order_id_idx" ON "merch_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merch_orders_user_id_idx" ON "merch_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "play_history_user_id_idx" ON "play_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "play_history_podcast_id_idx" ON "play_history" USING btree ("podcast_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_podcasts_playlist_id_idx" ON "playlist_podcasts" USING btree ("playlist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_podcasts_podcast_id_idx" ON "playlist_podcasts" USING btree ("podcast_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "podcasts_category_id_idx" ON "podcasts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "podcasts_created_by_idx" ON "podcasts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_user_id_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_podcast_id_idx" ON "purchases" USING btree ("podcast_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_playlist_id_idx" ON "purchases" USING btree ("playlist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_idx" ON "subscriptions" USING btree ("plan_id");