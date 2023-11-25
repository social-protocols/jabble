
import * as schema from "#app/schema.ts";
import Database from "better-sqlite3";
import {
	drizzle,
	type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";

import process from "process";

const databasePath = process.env.DATABASE_PATH
const sqlite = new Database(databasePath);

export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, {
	schema,
});

import { post, type SelectPost } from "#app/schema.ts";
import { eq } from 'drizzle-orm';
 

export async function getPost(id: number): Promise<SelectPost> {
	let p: SelectPost[] = await db.select().from(post).where(eq(post.id, id))

	return p[0]
}