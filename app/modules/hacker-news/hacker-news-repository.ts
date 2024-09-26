import { type Transaction } from 'kysely'
import { type DB } from '#app/types/kysely-types.ts'

export async function getPostIdForHNItem(
	trx: Transaction<DB>,
	hnId: number,
): Promise<number | undefined> {
	const result = await trx
		.selectFrom('HNItem')
		.where('hnId', '=', hnId)
		.select('postId')
		.executeTakeFirst()
	return result?.postId
}

export async function getHNIdForPostId(
	trx: Transaction<DB>,
	postId: number,
): Promise<number | undefined> {
	const result = await trx
		.selectFrom('HNItem')
		.where('postId', '=', postId)
		.select('hnId')
		.executeTakeFirst()
	return result?.hnId
}
