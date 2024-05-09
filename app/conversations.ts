import { sql } from "kysely"
import { type Post } from '#app/db/types.ts'
import { db } from "#app/db.ts"
import { getOrInsertTagId } from "./tag.ts"

export type ThreadPost = Post & { isCritical: boolean }

export async function getCriticalThread(postId: number, tag: string): Promise<ThreadPost[]> {
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
						.select(['S.postId', 'S.topNoteId', 'S.criticalThreadId'])
				)
		)
		.selectFrom('CriticalThread')
		.select('postId')
		.select(eb =>
			eb.fn.coalesce(sql<number>`criticalThreadId`, sql<number>`postId`).as('criticalThreadId'),
		)
		.where('postId', '>', postId)
		.execute()

	let isCriticalMap = new Map<number, boolean>()
	postWithCriticalThreadId.forEach(post => {
		isCriticalMap.set(post.postId, post.criticalThreadId !== post.postId)
	})

	const postIdsInThread = postWithCriticalThreadId.map(p => p.postId)
	const posts: Post[] = await db
		.selectFrom('Post')
		.where('id', 'in', postIdsInThread)
		.selectAll()
		.orderBy('createdAt')
		.execute()

	const threadPosts: ThreadPost[] = posts.map(post => {
		return {
			...post,
			isCritical: isCriticalMap.get(post.id)!,
		}
	})
	
	return threadPosts
}


