
import assert from 'assert';
import { type Selectable, sql } from 'kysely';
import { type Tag } from '#app/db/types.ts'; // this is the Database interface we defined earlier
import { db } from "#app/db.ts";
 
export async function getOrInsertTagId(tag: string): Promise<number> {
    // let t: Selectable<Tag>[] = await db.selectFrom("tag").where("tag", "=", tag).selectAll().execute()

    let t: Selectable<Tag>[] = (await sql<Selectable<Tag>>`select * from tag where tag = ${tag}`.execute(db)).rows

    console.log("Got tag", tag, t, t[0])

    if (t.length == 0) {
        // use drizzle to create new tag
        let newTag = await db.insertInto("Tag").values({ tag: tag }).execute()
        console.log("Newtag", newTag)

    }

    t = await db.selectFrom("Tag").where("tag", "=", tag).selectAll().execute()
    assert(t.length == 1)
    console.log("Got tag", tag, t, t[0])
    return t[0].id
}