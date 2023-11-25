import { InferModel, sql } from "drizzle-orm";
import { AnySQLiteColumn, blob, foreignKey, index, integer, numeric, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";


export const user = sqliteTable("user", {
	id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
	email: text("email").notNull(),
	username: text("username").notNull(),
	name: text("name"),
	createdAt: numeric("created_at").default(sql`(unixepoch(CURRENT_TIMESTAMP))`).notNull(),
},
	(table) => {
		return {
			usernameKey: uniqueIndex("user_username_key").on(table.username),
			emailKey: uniqueIndex("user_email_key").on(table.email),
			idKey: uniqueIndex("user_id_key").on(table.id),
		}
	});

export type User = InferModel<typeof user>;

export const userImage = sqliteTable("user_image", {
	id: text("id").primaryKey().notNull(),
	altText: text("alt_text"),
	contentType: text("content_Type").notNull(),
	blob: blob("blob").notNull(),
	createdAt: numeric("created_at").default(sql`(unixepoch(CURRENT_TIMESTAMP))`).notNull(),
	updatedAt: numeric("updated_at").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
},
	(table) => {
		return {
			userIdKey: uniqueIndex("user_image_user_id_key").on(table.userId),
		}
	});

export type UserImage = InferModel<typeof userImage>;

export const password = sqliteTable("password", {
	hash: text("hash").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
},
	(table) => {
		return {
			userIdKey: uniqueIndex("password_user_id_key").on(table.userId),
		}
	});

export type Password = InferModel<typeof password>;

export const session = sqliteTable("session", {
	id: text("id").primaryKey().notNull(),
	expirationDate: numeric("expiration_date").notNull(),
	createdAt: numeric("created_at").default(sql`(unixepoch(CURRENT_TIMESTAMP))`).notNull(),
	updatedAt: numeric("updated_at").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
},
	(table) => {
		return {
			userIdIdx: index("Session_userId_idx").on(table.userId),
		}
	});

export type Session = InferModel<typeof session>;

export const verification = sqliteTable("verification", {
	id: text("id").primaryKey().notNull(),
	createdAt: numeric("created_at").default(sql`(unixepoch(CURRENT_TIMESTAMP))`).notNull(),
	type: text("type").notNull(),
	target: text("target").notNull(),
	secret: text("secret").notNull(),
	algorithm: text("algorithm").notNull(),
	digits: integer("digits").notNull(),
	period: integer("period").notNull(),
	charSet: text("charSet").notNull(),
	expiresAt: numeric("expiresAt"),
},
	(table) => {
		return {
			targetTypeKey: uniqueIndex("verification_target_type_key").on(table.target, table.type),
		}
	});

export type Verification = InferModel<typeof verification>;

export const post = sqliteTable("post", {
	id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
	parentId: integer("parent_id"),
	content: text("content").notNull(),
	authorId: integer("author_id").notNull().references(() => user.id),
	createdAt: numeric("created_at").default(sql`(unixepoch(CURRENT_TIMESTAMP))`).notNull(),
},
	(table) => {
		return {
			postParentIdPostIdFk: foreignKey(() => ({
				columns: [table.parentId],
				foreignColumns: [table.id],
				name: "post_parent_id_post_id_fk"
			})),
		}
	});

export type Post = InferModel<typeof post>;

export const tag = sqliteTable("tag", {
	id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
	tag: text("tag").notNull(),
},
	(table) => {
		return {
			tagKey: uniqueIndex("tag_tag_key").on(table.tag),
		}
	});

export type Tag = InferModel<typeof tag>;

export const voteHistory = sqliteTable("vote_history", {
	rowid: integer("rowid").primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => user.id),
	tagId: integer("tag_id").notNull().references(() => tag.id),
	postId: integer("post_id").notNull(),
	noteId: integer("note_id"),
	direction: integer("direction").notNull(),
	createdAt: numeric("created_at").default(sql`(unixepoch(CURRENT_TIMESTAMP))`).notNull(),
});

export type VoteHistory = InferModel<typeof voteHistory>;

export const cumulativeStats = sqliteTable("cumulative_stats", {
	tagId: integer("tag_id").notNull(),
	postId: integer("post_id").notNull(),
	attention: integer("attention").notNull(),
	uniqueUsers: text("unique_users").notNull(),
},
	(table) => {
		return {
			postIdKey: uniqueIndex("cumulative_stats_post_id_key").on(table.postId),
		}
	});

export type CumulativeStats = InferModel<typeof cumulativeStats>;