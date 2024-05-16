import { type Tag } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
import { invariant } from './utils/misc.tsx'

export async function getOrInsertTagId(tag: string): Promise<number> {
	const t = await db.transaction().execute(async trx => {
		let t: Tag[] = await trx
			.selectFrom('Tag')
			.where('tag', '=', tag)
			.selectAll()
			.execute()

		if (t.length == 0) {
			await trx.insertInto('Tag').values({ tag: tag }).execute()
		}

		return await trx
			.selectFrom('Tag')
			.where('tag', '=', tag)
			.selectAll()
			.execute()
	})

	invariant(t[0], `Couldn't find or create tag ${tag}`)

	return t[0].id
}
