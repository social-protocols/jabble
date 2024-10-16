import { type Transaction } from 'kysely'
import { type DB } from '#app/database/types.ts'
import { type Tag } from './tag-types.ts'

export async function insertTag(
	trx: Transaction<DB>,
	tag: string,
): Promise<Tag> {
	await trx
		.insertInto('Tag')
		.values({ tag })
		.onConflict(oc => oc.column('tag').doNothing())
		.execute()

	return getTag(trx, tag)
}

export async function getTag(trx: Transaction<DB>, tag: string): Promise<Tag> {
	return await trx
		.selectFrom('Tag')
		.where('tag', '=', tag)
		.selectAll()
		.executeTakeFirstOrThrow()
}

export async function getTagById(
	trx: Transaction<DB>,
	tagId: number,
): Promise<Tag> {
	return await trx
		.selectFrom('Tag')
		.where('id', '=', tagId)
		.selectAll()
		.executeTakeFirstOrThrow()
}

export async function insertPostTag(
	trx: Transaction<DB>,
	postId: number,
	tagId: number,
): Promise<void> {
	await trx
		.insertInto('PostTag')
		.values({ postId, tagId })
		.onConflict(oc => oc.doNothing())
		.execute()
}
