// Database client for client-side usage
// Note: Direct DB access should only be used in API routes
// This file exports schema types for client-side type safety

export * from './schema';

// For API routes, use this pattern:
// import { neon } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-http';
// const sql = neon(process.env.DATABASE_URL!);
// const db = drizzle(sql);
