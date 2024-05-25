import { type Transaction } from 'kysely'
import { type Tag } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { type DB } from './db/kysely-types.ts'
import { invariant } from './utils/misc.tsx'

export async function getOrInsertTagId(trx: Transaction<DB>): Promise<number> {
	const tag = 'global'
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
