import assert from 'assert'
import { type Tag } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'

export async function getOrInsertTagId(tag: string): Promise<number> {
  // let t: Selectable<Tag>[] = await db.selectFrom("tag").where("tag", "=", tag).selectAll().execute()

  // return 0
  const t = await db.transaction().execute(async trx => {
    let t: Tag[] = await trx
      .selectFrom('Tag')
      .where('tag', '=', tag)
      .selectAll()
      .execute()

    if (t.length == 0) {
      // use drizzle to create new tag
      let _newTag = await trx.insertInto('Tag').values({ tag: tag }).execute()
    }

    return await trx
      .selectFrom('Tag')
      .where('tag', '=', tag)
      .selectAll()
      .execute()
  })

  assert(t[0] !== undefined)
  return t[0]!.id
}
