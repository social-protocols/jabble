import { db } from "#app/db.ts";
import * as schema from "#app/schema.ts";
import { type SelectTag } from "#app/schema.ts";

import { eq, sql } from 'drizzle-orm';

import assert from 'assert';
 

export async function getOrInsertTagId(tag: string): Promise<number> {

    let t: SelectTag[] = await db.select().from(schema.tag).where(eq(schema.tag.tag, tag))

    if (t.length == 0) {
        // use drizzle to create new tag
        let newTag = await db.insert(schema.tag).values({ tag: tag }).execute()
    }

    t = await db.select().from(schema.tag).where(eq(schema.tag.tag, tag))
    assert(t.length == 1)
    return t[0].id
}