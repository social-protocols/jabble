
import { db } from "#app/db.ts";
import { type Tag } from '#app/db/types.ts'; // this is the Database interface we defined earlier
import assert from 'assert';
import { sql, type Selectable } from 'kysely';


 
export async function getOrInsertTagId(tag: string): Promise<number> {
    // let t: Selectable<Tag>[] = await db.selectFrom("tag").where("tag", "=", tag).selectAll().execute()

    // return 0

    let t: Selectable<Tag>[] = (await sql<Selectable<Tag>>`select * from tag where tag = ${tag}`.execute(db)).rows

    if (t.length == 0) {
        // use drizzle to create new tag
        let newTag = await db.insertInto("Tag").values({ tag: tag }).execute()

    }

    t = await db.selectFrom("Tag").where("tag", "=", tag).selectAll().execute()
    assert(t.length == 1)
    return t[0]!.id
}