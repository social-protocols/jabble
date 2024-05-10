import { sql } from 'kysely'
import { db } from '#app/db.ts'
import { getOrInsertTagId } from './tag.ts'
import { getScoredPost, type ScoredPost } from './ranking.ts'


export type ThreadPost = ScoredPost & { isCritical: boolean }

export async function getCriticalThread(
	postId: number,
	tag: string,
): Promise<ThreadPost[]> {
	const tagId = await getOrInsertTagId(tag)

	const postWithCriticalThreadId = await db
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
		postWithCriticalThreadId.map(post => getScoredPost(tag, post.postId))
	)

	const threadPosts: ThreadPost[] = scoredPosts.map(post => {
		return {
			...post,
			isCritical: isCriticalMap.get(post.id)!,
		}
	})

	return threadPosts
}
