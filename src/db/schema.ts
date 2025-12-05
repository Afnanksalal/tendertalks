import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const podcastTypeEnum = pgEnum('podcast_type', ['audio', 'video']);
export const podcastStatusEnum = pgEnum('podcast_status', [
  'draft',
  'scheduled',
  'live',
  'published',
  'archived',
]);
export const purchaseStatusEnum = pgEnum('purchase_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'cancelled',
  'expired',
  'paused',
  'pending_downgrade',
]);
export const refundStatusEnum = pgEnum('refund_status', [
  'pending',
  'approved',
  'processed',
  'rejected',
]);
export const merchCategoryEnum = pgEnum('merch_category', ['clothing', 'accessories', 'digital']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
]);
export const blogStatusEnum = pgEnum('blog_status', ['draft', 'published', 'archived']);

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
export const podcasts = pgTable(
  'podcasts',
  {
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
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    viewCount: integer('view_count').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    categoryIdIdx: index('podcasts_category_id_idx').on(table.categoryId),
    createdByIdx: index('podcasts_created_by_idx').on(table.createdBy),
  })
);

// Tags
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

export const podcastTags = pgTable('podcast_tags', {
  podcastId: uuid('podcast_id')
    .references(() => podcasts.id, { onDelete: 'cascade' })
    .notNull(),
  tagId: uuid('tag_id')
    .references(() => tags.id, { onDelete: 'cascade' })
    .notNull(),
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
  includesPlaylists: boolean('includes_playlists').default(false).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Subscriptions
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    planId: uuid('plan_id')
      .references(() => pricingPlans.id)
      .notNull(),
    status: subscriptionStatusEnum('status').default('active').notNull(),
    razorpaySubscriptionId: text('razorpay_subscription_id'),
    razorpayPaymentId: text('razorpay_payment_id'),
    razorpayOrderId: text('razorpay_order_id'),
    amount: decimal('amount', { precision: 10, scale: 2 }),
    currency: text('currency').default('INR'),
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    cancelledAt: timestamp('cancelled_at'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    pendingPlanId: uuid('pending_plan_id').references(() => pricingPlans.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
    planIdIdx: index('subscriptions_plan_id_idx').on(table.planId),
  })
);

// Payment History (for all transactions)
export const paymentHistory = pgTable('payment_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  type: text('type').notNull(), // 'subscription', 'purchase', 'merch', 'upgrade', 'downgrade'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'completed', 'failed', 'refunded'
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  razorpaySignature: text('razorpay_signature'),
  metadata: text('metadata'), // JSON string for additional data
  refId: uuid('ref_id'), // Reference to subscription/purchase/order
  refType: text('ref_type'), // 'subscription', 'purchase', 'merch_order'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Refund Requests
export const refundRequests = pgTable('refund_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  paymentHistoryId: uuid('payment_history_id').references(() => paymentHistory.id),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  purchaseId: uuid('purchase_id').references(() => purchases.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR').notNull(),
  reason: text('reason'),
  status: refundStatusEnum('status').default('pending').notNull(),
  razorpayRefundId: text('razorpay_refund_id'),
  processedBy: uuid('processed_by').references(() => users.id),
  processedAt: timestamp('processed_at'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Playlists
export const playlists = pgTable('playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  coverUrl: text('cover_url'),
  price: decimal('price', { precision: 10, scale: 2 }).default('0'),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Playlist Podcasts (Junction)
export const playlistPodcasts = pgTable(
  'playlist_podcasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playlistId: uuid('playlist_id')
      .references(() => playlists.id, { onDelete: 'cascade' })
      .notNull(),
    podcastId: uuid('podcast_id')
      .references(() => podcasts.id, { onDelete: 'cascade' })
      .notNull(),
    order: integer('order').default(0),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => ({
    playlistIdIdx: index('playlist_podcasts_playlist_id_idx').on(table.playlistId),
    podcastIdIdx: index('playlist_podcasts_podcast_id_idx').on(table.podcastId),
  })
);

// Podcast Purchases
export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    podcastId: uuid('podcast_id').references(() => podcasts.id), // Made nullable
    playlistId: uuid('playlist_id').references(() => playlists.id), // Added
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').default('INR').notNull(),
    status: purchaseStatusEnum('status').default('pending').notNull(),
    razorpayOrderId: text('razorpay_order_id'),
    razorpayPaymentId: text('razorpay_payment_id'),
    razorpaySignature: text('razorpay_signature'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('purchases_user_id_idx').on(table.userId),
    podcastIdIdx: index('purchases_podcast_id_idx').on(table.podcastId),
    playlistIdIdx: index('purchases_playlist_id_idx').on(table.playlistId),
  })
);

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
export const merchOrders = pgTable(
  'merch_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
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
  },
  (table) => ({
    userIdIdx: index('merch_orders_user_id_idx').on(table.userId),
  })
);

// Merch Order Items
export const merchOrderItems = pgTable(
  'merch_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .references(() => merchOrders.id, { onDelete: 'cascade' })
      .notNull(),
    merchItemId: uuid('merch_item_id')
      .references(() => merchItems.id)
      .notNull(),
    quantity: integer('quantity').notNull(),
    priceAtPurchase: decimal('price_at_purchase', { precision: 10, scale: 2 }).notNull(),
  },
  (table) => ({
    orderIdIdx: index('merch_order_items_order_id_idx').on(table.orderId),
  })
);

// Downloads tracking
export const downloads = pgTable(
  'downloads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    podcastId: uuid('podcast_id')
      .references(() => podcasts.id)
      .notNull(),
    downloadedAt: timestamp('downloaded_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => ({
    userIdIdx: index('downloads_user_id_idx').on(table.userId),
    podcastIdIdx: index('downloads_podcast_id_idx').on(table.podcastId),
  })
);

// Play History
export const playHistory = pgTable(
  'play_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    podcastId: uuid('podcast_id')
      .references(() => podcasts.id)
      .notNull(),
    progress: integer('progress').default(0),
    completed: boolean('completed').default(false),
    lastPlayedAt: timestamp('last_played_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('play_history_user_id_idx').on(table.userId),
    podcastIdIdx: index('play_history_podcast_id_idx').on(table.podcastId),
  })
);

// Newsletter subscribers
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  subscribedAt: timestamp('subscribed_at').defaultNow().notNull(),
  unsubscribedAt: timestamp('unsubscribed_at'),
});

// Site Settings / Feature Toggles
export const siteSettings = pgTable('site_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// Blogs
export const blogs = pgTable('blogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  contentPath: text('content_path'), // Path to MD file in Supabase storage
  bannerUrl: text('banner_url'),
  status: blogStatusEnum('status').default('draft').notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  readTime: integer('read_time').default(0), // Estimated read time in minutes
  viewCount: integer('view_count').default(0),
  publishedAt: timestamp('published_at'),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Blog tags junction table
export const blogTags = pgTable('blog_tags', {
  blogId: uuid('blog_id')
    .references(() => blogs.id, { onDelete: 'cascade' })
    .notNull(),
  tagId: uuid('tag_id')
    .references(() => tags.id, { onDelete: 'cascade' })
    .notNull(),
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
  pendingPlan: one(pricingPlans, {
    fields: [subscriptions.pendingPlanId],
    references: [pricingPlans.id],
  }),
}));

export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  user: one(users, { fields: [paymentHistory.userId], references: [users.id] }),
}));

export const refundRequestsRelations = relations(refundRequests, ({ one }) => ({
  user: one(users, { fields: [refundRequests.userId], references: [users.id] }),
  processedByUser: one(users, { fields: [refundRequests.processedBy], references: [users.id] }),
  subscription: one(subscriptions, {
    fields: [refundRequests.subscriptionId],
    references: [subscriptions.id],
  }),
  purchase: one(purchases, { fields: [refundRequests.purchaseId], references: [purchases.id] }),
  paymentHistoryEntry: one(paymentHistory, {
    fields: [refundRequests.paymentHistoryId],
    references: [paymentHistory.id],
  }),
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
  merchItem: one(merchItems, {
    fields: [merchOrderItems.merchItemId],
    references: [merchItems.id],
  }),
}));

export const blogsRelations = relations(blogs, ({ one, many }) => ({
  creator: one(users, { fields: [blogs.createdBy], references: [users.id] }),
  tags: many(blogTags),
}));

export const blogTagsRelations = relations(blogTags, ({ one }) => ({
  blog: one(blogs, { fields: [blogTags.blogId], references: [blogs.id] }),
  tag: one(tags, { fields: [blogTags.tagId], references: [tags.id] }),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  creator: one(users, { fields: [playlists.createdBy], references: [users.id] }),
  podcasts: many(playlistPodcasts),
  purchases: many(purchases),
}));

export const playlistPodcastsRelations = relations(playlistPodcasts, ({ one }) => ({
  playlist: one(playlists, { fields: [playlistPodcasts.playlistId], references: [playlists.id] }),
  podcast: one(podcasts, { fields: [playlistPodcasts.podcastId], references: [podcasts.id] }),
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
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type RefundRequest = typeof refundRequests.$inferSelect;
export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;
export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;
export type PlaylistPodcast = typeof playlistPodcasts.$inferSelect;
export type NewPlaylistPodcast = typeof playlistPodcasts.$inferInsert;
export type SiteSetting = typeof siteSettings.$inferSelect;
