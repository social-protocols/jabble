import { sqliteTable, AnySQLiteColumn, uniqueIndex, integer, text, numeric, foreignKey, blob, index } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"


export const user = sqliteTable("User", {
	idInt: integer("idInt").primaryKey({ autoIncrement: true }).notNull(),
	id: text("id").notNull(),
	email: text("email").notNull(),
	username: text("username").notNull(),
	name: text("name"),
	createdAt: numeric("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => {
	return {
		usernameKey: uniqueIndex("User_username_key").on(table.username),
		emailKey: uniqueIndex("User_email_key").on(table.email),
		idKey: uniqueIndex("User_id_key").on(table.id),
	}
});

export const userImage = sqliteTable("UserImage", {
	id: text("id").primaryKey().notNull(),
	altText: text("altText"),
	contentType: text("contentType").notNull(),
	blob: blob("blob").notNull(),
	createdAt: numeric("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updatedAt").notNull(),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		userIdKey: uniqueIndex("UserImage_userId_key").on(table.userId),
	}
});

export const password = sqliteTable("Password", {
	hash: text("hash").notNull(),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		userIdKey: uniqueIndex("Password_userId_key").on(table.userId),
	}
});

export const session = sqliteTable("Session", {
	id: text("id").primaryKey().notNull(),
	expirationDate: numeric("expirationDate").notNull(),
	createdAt: numeric("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric("updatedAt").notNull(),
	userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		userIdIdx: index("Session_userId_idx").on(table.userId),
	}
});

export const verification = sqliteTable("Verification", {
	id: text("id").primaryKey().notNull(),
	createdAt: numeric("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
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
		targetTypeKey: uniqueIndex("Verification_target_type_key").on(table.target, table.type),
	}
});

export const post = sqliteTable("post", {
	id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
	parentId: integer("parent_id"),
	content: text("content").notNull(),
	authorId: integer("author_id").notNull().references(() => user.idInt),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
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

export const tag = sqliteTable("tag", {
	id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
	tag: text("tag").notNull(),
},
(table) => {
	return {
		tagKey: uniqueIndex("tag_tag_key").on(table.tag),
	}
});

export const voteHistory = sqliteTable("vote_history", {
	rowid: integer("rowid").primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => user.idInt),
	tagId: integer("tag_id").notNull().references(() => tag.id),
	postId: integer("post_id").notNull(),
	noteId: integer("note_id"),
	direction: integer("direction").notNull(),
	createdAt: numeric("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const cumulativeStats = sqliteTable("cumulative_stats", {
	tagId: integer("tag_id").notNull(),
	postId: integer("post_id").notNull(),
	attention: integer("attention").notNull(),
	uniqueUsers: text("uniqueUsers").notNull(),
},
(table) => {
	return {
		postIdKey: uniqueIndex("cumulative_stats_post_id_key").on(table.postId),
	}
});