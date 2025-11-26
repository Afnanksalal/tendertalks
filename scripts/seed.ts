/**
 * Database Seed Script for TenderTalks
 * 
 * Run with: npx tsx scripts/seed.ts
 * 
 * Make sure you have a .env file with DATABASE_URL set
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { 
  users, 
  categories, 
  tags, 
  pricingPlans, 
  merchItems 
} from '../src/db/schema';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Make sure you have a .env file with DATABASE_URL set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// ============================================
// SEED DATA
// ============================================

const categoriesData = [
  { name: 'Technology', slug: 'technology', description: 'Latest in tech, AI, and software development' },
  { name: 'Business', slug: 'business', description: 'Entrepreneurship, startups, and business strategy' },
  { name: 'Science', slug: 'science', description: 'Scientific discoveries and research' },
  { name: 'Philosophy', slug: 'philosophy', description: 'Deep thoughts and philosophical discussions' },
  { name: 'Health', slug: 'health', description: 'Health, wellness, and biohacking' },
  { name: 'Culture', slug: 'culture', description: 'Society, trends, and cultural phenomena' },
];

const tagsData = [
  { name: 'AI', slug: 'ai' },
  { name: 'Machine Learning', slug: 'machine-learning' },
  { name: 'Startups', slug: 'startups' },
  { name: 'Productivity', slug: 'productivity' },
  { name: 'Future', slug: 'future' },
  { name: 'Innovation', slug: 'innovation' },
  { name: 'Leadership', slug: 'leadership' },
  { name: 'Mindset', slug: 'mindset' },
  { name: 'Web3', slug: 'web3' },
  { name: 'Crypto', slug: 'crypto' },
];

const pricingPlansData = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Get started with free content',
    price: '0',
    currency: 'INR',
    interval: 'month',
    features: [
      'Access to free podcasts',
      'Standard audio quality',
      'Web player access',
      'Community discussions',
    ],
    allowDownloads: false,
    allowOffline: false,
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For serious listeners',
    price: '299',
    currency: 'INR',
    interval: 'month',
    features: [
      'All free content',
      'Premium podcasts',
      'HD audio quality',
      'Download for offline',
      'Early access to new episodes',
      'Ad-free experience',
    ],
    allowDownloads: true,
    allowOffline: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Premium',
    slug: 'premium',
    description: 'Best value for power users',
    price: '2499',
    currency: 'INR',
    interval: 'year',
    features: [
      'Everything in Pro',
      'Exclusive video content',
      'Priority support',
      'Community access',
      'Monthly Q&A sessions',
      'Save 30% annually',
    ],
    allowDownloads: true,
    allowOffline: true,
    isActive: true,
    sortOrder: 2,
  },
];

const merchItemsData = [
  {
    name: 'TenderTalks Classic Tee',
    slug: 'classic-tee',
    description: 'Premium cotton t-shirt with the TenderTalks logo.',
    price: '799',
    currency: 'INR',
    category: 'clothing' as const,
    inStock: true,
    stockQuantity: 100,
    isActive: true,
  },
  {
    name: 'Future Hoodie',
    slug: 'future-hoodie',
    description: 'Cozy hoodie with "Future Unfiltered" print.',
    price: '1499',
    currency: 'INR',
    category: 'clothing' as const,
    inStock: true,
    stockQuantity: 50,
    isActive: true,
  },
  {
    name: 'Podcast Sticker Pack',
    slug: 'sticker-pack',
    description: 'Set of 10 premium vinyl stickers.',
    price: '199',
    currency: 'INR',
    category: 'accessories' as const,
    inStock: true,
    stockQuantity: 200,
    isActive: true,
  },
  {
    name: 'Tech Mug',
    slug: 'tech-mug',
    description: 'Ceramic mug with circuit board design. 350ml.',
    price: '499',
    currency: 'INR',
    category: 'accessories' as const,
    inStock: true,
    stockQuantity: 75,
    isActive: true,
  },
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedCategories() {
  console.log('📁 Seeding categories...');
  
  for (const category of categoriesData) {
    try {
      const existing = await db.select().from(categories).where(eq(categories.slug, category.slug)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(categories).values(category);
        console.log(`  ✓ Created: ${category.name}`);
      } else {
        console.log(`  - Exists: ${category.name}`);
      }
    } catch (err) {
      console.log(`  ✗ Error with ${category.name}:`, err);
    }
  }
}

async function seedTags() {
  console.log('🏷️  Seeding tags...');
  
  for (const tag of tagsData) {
    try {
      const existing = await db.select().from(tags).where(eq(tags.slug, tag.slug)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(tags).values(tag);
        console.log(`  ✓ Created: ${tag.name}`);
      } else {
        console.log(`  - Exists: ${tag.name}`);
      }
    } catch (err) {
      console.log(`  ✗ Error with ${tag.name}:`, err);
    }
  }
}

async function seedPricingPlans() {
  console.log('💰 Seeding pricing plans...');
  
  for (const plan of pricingPlansData) {
    try {
      const existing = await db.select().from(pricingPlans).where(eq(pricingPlans.slug, plan.slug)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(pricingPlans).values(plan);
        console.log(`  ✓ Created: ${plan.name}`);
      } else {
        await db.update(pricingPlans).set(plan).where(eq(pricingPlans.slug, plan.slug));
        console.log(`  ↻ Updated: ${plan.name}`);
      }
    } catch (err) {
      console.log(`  ✗ Error with ${plan.name}:`, err);
    }
  }
}

async function seedMerchItems() {
  console.log('🛍️  Seeding merch items...');
  
  for (const item of merchItemsData) {
    try {
      const existing = await db.select().from(merchItems).where(eq(merchItems.slug, item.slug)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(merchItems).values(item);
        console.log(`  ✓ Created: ${item.name}`);
      } else {
        console.log(`  - Exists: ${item.name}`);
      }
    } catch (err) {
      console.log(`  ✗ Error with ${item.name}:`, err);
    }
  }
}

async function createAdminUser(userId: string, email: string, name: string) {
  console.log('👤 Creating/updating admin user...');
  
  try {
    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (existing.length === 0) {
      await db.insert(users).values({
        id: userId,
        email,
        name,
        role: 'admin',
      });
      console.log(`  ✓ Created admin: ${email}`);
    } else if (existing[0].role !== 'admin') {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
      console.log(`  ✓ Promoted to admin: ${existing[0].email}`);
    } else {
      console.log(`  - Admin exists: ${existing[0].email}`);
    }
  } catch (err) {
    console.log(`  ✗ Error creating admin:`, err);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('🌱 TenderTalks Database Seeder');
  console.log('================================');
  console.log('');
  
  try {
    await seedCategories();
    console.log('');
    
    await seedTags();
    console.log('');
    
    await seedPricingPlans();
    console.log('');
    
    await seedMerchItems();
    console.log('');
    
    // Check if admin user ID was provided as argument
    const adminUserId = process.argv[2];
    const adminEmail = process.argv[3] || 'admin@tendertalks.com';
    const adminName = process.argv[4] || 'Admin';
    
    if (adminUserId) {
      await createAdminUser(adminUserId, adminEmail, adminName);
      console.log('');
    } else {
      console.log('💡 To create an admin user, run:');
      console.log('   npx tsx scripts/seed.ts <supabase-user-uuid> <email> <name>');
      console.log('');
    }
    
    console.log('================================');
    console.log('✅ Seeding complete!');
    console.log('');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
