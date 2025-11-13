import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	hwid: text('hwid').notNull().default('')
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const account = sqliteTable('account', {
	ownerId: text('owner_id')
		.notNull()
		.references(() => user.id),
	verified: integer('verified').notNull().default(0),
	guid: text('guid').primaryKey(),
	password: text('password').notNull(),
	name: text('name').notNull(),
	inventoryRaw: text('inventory_raw').notNull().default(''),
	seasonal: integer('seasonal').notNull()
});

export const tradeListing = sqliteTable('trade_listing', {
	id: text('id').primaryKey(),
	sellerId: text('seller_id')
		.notNull()
		.references(() => user.id),
	accountGuids: text('account_guids').notNull(), // JSON array of account GUIDs being sold
	askingPrice: text('asking_price').notNull(), // JSON array of item names
	status: text('status').notNull().default('active'), // active, completed, cancelled
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const tradeOffer = sqliteTable('trade_offer', {
	id: text('id').primaryKey(),
	listingId: text('listing_id')
		.notNull()
		.references(() => tradeListing.id),
	buyerId: text('buyer_id')
		.notNull()
		.references(() => user.id),
	offerAccountGuids: text('offer_account_guids').notNull(), // JSON array of account GUIDs being offered
	status: text('status').notNull().default('pending'), // pending, accepted, rejected
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type AccountDB = typeof account.$inferSelect;

export type TradeListing = typeof tradeListing.$inferSelect;

export type TradeOffer = typeof tradeOffer.$inferSelect;
