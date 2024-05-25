import { type Transaction, sql } from 'kysely'
import { type DB } from './db/kysely-types.ts'
import { getScoredPost, type ScoredPost } from './ranking.ts'
import { getOrInsertTagId } from './tag.ts'
import { relativeEntropy } from './utils/entropy.ts'
import { invariant } from './utils/misc.tsx'

export type ThreadPost = ScoredPost & {
	isCritical: boolean
	effectOnParentSize?: number
}

export async function getCriticalThread(
	trx: Transaction<DB>,
	postId: number,
	tag: string,
): Promise<ThreadPost[]> {
	const tagId = await getOrInsertTagId(trx)

	const postWithCriticalThreadId = await trx
		.withRecursive('CriticalThread', db =>
			db
				.selectFrom('Score')
				.where('postId', '=', postId)
				.where('tagId', '=', tagId)
				.select(['postId', 'topNoteId', 'criticalThreadId'])
				.unionAll(db =>
					db
						.selectFrom('Score as S')
						.where('tagId', '=', tagId)
						.innerJoin('CriticalThread as CT', 'S.postId', 'CT.topNoteId')
						.select(['S.postId', 'S.topNoteId', 'S.criticalThreadId']),
				),
		)
		.selectFrom('CriticalThread')
		.select('postId')
		.select(eb =>
			eb.fn
				.coalesce(sql<number>`criticalThreadId`, sql<number>`postId`)
				.as('criticalThreadId'),
		)
		.where('postId', '>', postId)
		.execute()

	let isCriticalMap = new Map<number, boolean>()
	postWithCriticalThreadId.forEach(post => {
		isCriticalMap.set(post.postId, post.criticalThreadId !== post.postId)
	})

	const scoredPosts = await Promise.all(
		postWithCriticalThreadId.map(post => getScoredPost(trx, tag, post.postId)),
	)

	const effects = await trx
		.selectFrom('Effect')
		.where(
			'noteId',
			'in',
			scoredPosts.map(post => post.id),
		)
		.selectAll('Effect')
		.execute()

	const effectSizes = effects.map(effect => {
		invariant(
			effect.noteId,
			`Got effect for post ${effect.postId} with noteId = null`,
		)
		return {
			postId: effect.noteId,
			effectSize: relativeEntropy(effect.p, effect.q),
		}
	})

	const effectMap = new Map<number, number>()
	effectSizes.forEach(effectSize => {
		effectMap.set(effectSize.postId, effectSize.effectSize)
	})

	const threadPosts: ThreadPost[] = scoredPosts.map(post => {
		let isCritical = isCriticalMap.get(post.id)
		if (isCritical == null || isCritical == undefined) {
			isCritical = false
			console.warn(
				`Can't determine isCritical for post ${post.id}. Defaulting to false.`,
			)
		}
		return {
			...post,
			isCritical: isCritical,
			effectOnParentSize: effectMap.get(post.id),
		}
	})

	return threadPosts
}
