import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	username: text('username').notNull(),
});

export const recaptchaTokens = sqliteTable('recaptcha_tokens', {
	token: text('token').primaryKey(),
});