import { type Tag } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
import { invariant } from './utils/misc.tsx'
import { Transaction } from 'kysely'
import { DB } from './db/kysely-types.ts'

export async function getOrInsertTagId(tag: string, trx?: Transaction<DB>): Promise<number> {
	async function executeQueryInTrx(trx: Transaction<DB>) {
		let existingTag: Tag | undefined = await trx
			.selectFrom('Tag')
			.where('tag', '=', tag)
			.selectAll()
			.executeTakeFirst()

		if (!existingTag) {
			await trx.insertInto('Tag').values({ tag: tag }).execute()
			existingTag = await trx
				.selectFrom('Tag')
				.where('tag', '=', tag)
				.selectAll()
				.executeTakeFirstOrThrow()
		}

		invariant(existingTag, `Couldn't find or create tag ${tag}`)

		return existingTag.id
	}

	return trx
		? await executeQueryInTrx(trx)
		: await db.transaction().execute(async (trx) => executeQueryInTrx(trx))
}
