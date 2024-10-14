import { type Transaction } from 'kysely'
import { type DB, type DBEffect } from '#app/database/types.ts'
import { snakeToCamelCaseObject } from './scoring-utils.ts'

export async function insertEffectEvent(trx: Transaction<DB>, data: any) {
	const data_flat = {
		voteEventId: data['vote_event_id'],
		voteEventTime: data['vote_event_time'],
		...snakeToCamelCaseObject(data['effect']),
	}

	await trx
		.insertInto('EffectEvent')
		.values(data_flat)
		.onConflict(oc =>
			oc.columns(['voteEventId', 'postId', 'commentId']).doNothing(),
		)
		.execute()
}

export async function getEffect(
	trx: Transaction<DB>,
	postId: number,
	commentId: number,
): Promise<DBEffect | undefined> {
	const effect: DBEffect | undefined = await trx
		.selectFrom('Effect')
		.where('postId', '=', postId)
		.where('commentId', '=', commentId)
		.selectAll()
		.executeTakeFirst()
	return effect
}

export async function getEffects(
	trx: Transaction<DB>,
	postId: number,
): Promise<DBEffect[]> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('EffectWithDefault as Effect', join =>
			join.on('Effect.commentId', '=', postId),
		)
		.innerJoin('Post as TargetPost', 'TargetPost.id', 'Effect.postId')
		.selectAll('Effect')
		.where('Post.id', '=', postId)
		.orderBy('TargetPost.createdAt')

	const effects = await query.execute()
	return effects
}
