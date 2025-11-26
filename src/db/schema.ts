import { pgTable, uuid, text, timestamp, boolean, decimal, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const podcastTypeEnum = pgEnum('podcast_type', ['audio', 'video']);
export const podcastStatusEnum = pgEnum('podcast_status', ['draft', 'scheduled', 'live', 'published', 'archived']);
export const purchaseStatusEnum = pgEnum('purchase_status', ['pending', 'completed', 'failed', 'refunded']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'expired', 'paused']);
export const merchCategoryEnum = pgEnum('merch_category', ['clothing', 'accessories', 'digital']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'shipped', 'delivered', 'cancelled']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Categories
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Podcasts
export const podcasts = pgTable('podcasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  mediaUrl: text('media_url'),
  mediaType: podcastTypeEnum('media_type').default('audio').notNull(),
  duration: integer('duration'),
  status: podcastStatusEnum('status').default('draft').notNull(),
  isFree: boolean('is_free').default(false).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).default('0'),
  isDownloadable: boolean('is_downloadable').default(false).notNull(),
  scheduledAt: timestamp('scheduled_at'),
  publishedAt: timestamp('published_at'),
  categoryId: uuid('category_id').references(() => categories.id),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tags
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

export const podcastTags = pgTable('podcast_tags', {
  podcastId: uuid('podcast_id').references(() => podcasts.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
});

// Pricing Plans
export const pricingPlans = pgTable('pricing_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR').notNull(),
  interval: text('interval').default('month').notNull(),
  features: text('features').array(),
  isActive: boolean('is_active').default(true).notNull(),
  allowDownloads: boolean('allow_downloads').default(false).notNull(),
  allowOffline: boolean('allow_offline').default(false).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  planId: uuid('plan_id').references(() => pricingPlans.id).notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  razorpaySubscriptionId: text('razorpay_subscription_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Podcast Purchases
export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  podcastId: uuid('podcast_id').references(() => podcasts.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR').notNull(),
  status: purchaseStatusEnum('status').default('pending').notNull(),
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  razorpaySignature: text('razorpay_signature'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Merch Items
export const merchItems = pgTable('merch_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR').notNull(),
  imageUrl: text('image_url'),
  category: merchCategoryEnum('category').default('accessories').notNull(),
  inStock: boolean('in_stock').default(true).notNull(),
  stockQuantity: integer('stock_quantity').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Merch Orders
export const merchOrders = pgTable('merch_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR').notNull(),
  shippingAddress: text('shipping_address'),
  shippingCity: text('shipping_city'),
  shippingState: text('shipping_state'),
  shippingZip: text('shipping_zip'),
  shippingCountry: text('shipping_country'),
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Merch Order Items
export const merchOrderItems = pgTable('merch_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => merchOrders.id, { onDelete: 'cascade' }).notNull(),
  merchItemId: uuid('merch_item_id').references(() => merchItems.id).notNull(),
  quantity: integer('quantity').notNull(),
  priceAtPurchase: decimal('price_at_purchase', { precision: 10, scale: 2 }).notNull(),
});

// Downloads tracking
export const downloads = pgTable('downloads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  podcastId: uuid('podcast_id').references(() => podcasts.id).notNull(),
  downloadedAt: timestamp('downloaded_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

// Play History
export const playHistory = pgTable('play_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  podcastId: uuid('podcast_id').references(() => podcasts.id).notNull(),
  progress: integer('progress').default(0),
  completed: boolean('completed').default(false),
  lastPlayedAt: timestamp('last_played_at').defaultNow().notNull(),
});

// Newsletter subscribers
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  subscribedAt: timestamp('subscribed_at').defaultNow().notNull(),
  unsubscribedAt: timestamp('unsubscribed_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  podcasts: many(podcasts),
  subscriptions: many(subscriptions),
  purchases: many(purchases),
  playHistory: many(playHistory),
  downloads: many(downloads),
  merchOrders: many(merchOrders),
}));

export const podcastsRelations = relations(podcasts, ({ one, many }) => ({
  creator: one(users, { fields: [podcasts.createdBy], references: [users.id] }),
  category: one(categories, { fields: [podcasts.categoryId], references: [categories.id] }),
  purchases: many(purchases),
  playHistory: many(playHistory),
  downloads: many(downloads),
  tags: many(podcastTags),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(pricingPlans, { fields: [subscriptions.planId], references: [pricingPlans.id] }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, { fields: [purchases.userId], references: [users.id] }),
  podcast: one(podcasts, { fields: [purchases.podcastId], references: [podcasts.id] }),
}));

export const merchOrdersRelations = relations(merchOrders, ({ one, many }) => ({
  user: one(users, { fields: [merchOrders.userId], references: [users.id] }),
  items: many(merchOrderItems),
}));

export const merchOrderItemsRelations = relations(merchOrderItems, ({ one }) => ({
  order: one(merchOrders, { fields: [merchOrderItems.orderId], references: [merchOrders.id] }),
  merchItem: one(merchItems, { fields: [merchOrderItems.merchItemId], references: [merchItems.id] }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Podcast = typeof podcasts.$inferSelect;
export type NewPodcast = typeof podcasts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type MerchItem = typeof merchItems.$inferSelect;
export type MerchOrder = typeof merchOrders.$inferSelect;
export type Download = typeof downloads.$inferSelect;
