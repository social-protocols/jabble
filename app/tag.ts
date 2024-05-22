import { type Tag } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
import { invariant } from './utils/misc.tsx'
import { Transaction } from 'kysely'
import { DB } from './db/kysely-types.ts'

export async function getOrInsertTagId(tag: string, trx?: Transaction<DB>): Promise<number> {
	async function executeQueryInTrx(trxLocal: Transaction<DB>, tagToPersist: string) {
		let existingTag: Tag | undefined = await trxLocal
			.selectFrom('Tag')
			.where('tag', '=', tagToPersist)
			.selectAll()
			.executeTakeFirst()

		if (!existingTag) {
			await trxLocal.insertInto('Tag').values({ tag: tagToPersist }).execute()
			existingTag = await trxLocal
				.selectFrom('Tag')
				.where('tag', '=', tagToPersist)
				.selectAll()
				.executeTakeFirstOrThrow()
		}

		invariant(existingTag, `Couldn't find or create tag ${tagToPersist}`)

		return existingTag.id
	}

	const persistedTagId = trx
		? await executeQueryInTrx(trx, tag)
		: await db.transaction().execute(async (trxLocal) => await executeQueryInTrx(trxLocal, tag))

	return persistedTagId
}
