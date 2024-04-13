import assert from 'assert'
import { sql } from 'kysely'
import { LRUCache } from 'lru-cache'
import { type Score, type Effect, type Post } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
// import { cumulativeAttention } from './attention.ts';
import {
	// logTagPageView,
	logTagPreview,
	flushTagPageStats,
} from './attention.ts'
import { getUserPositions, type Position } from './positions.ts'
// import { GLOBAL_PRIOR_VOTE_RATE, findTopNoteId } from './probabilities.ts'
import { getPost } from './post.ts'
import { getOrInsertTagId } from './tag.ts'

export type ScoredPost = Post & Score & Effect & { nReplies: number }

// Post with its effect on its parent
export type ScoredNote = Post & Effect

// const fatigueFactor = .9
// const attentionCutoff = 2 // Note all posts start with 1 unit of attention (from poster)

export const MAX_RESULTS = 100

export type RankedPost = ScoredPost & {
	random: boolean
	note: ScoredNote | null
	parent: Post | null
}

export type RankedPosts = {
	posts: RankedPost[]
	effectiveRandomPoolSize: number

}

let rankingsCache = new LRUCache<string, RankedPosts>({
	max: 100,
	ttl: 1000 * 60, // one minute

	// automatically purge items from cache when ttl is exceeded
	// we want to do this so that savePageStats is called to save attention stats in the DB
	// roughly once a minute.

	ttlAutopurge: true,

	// when we dispose of the page from the cache, call flushTagPageStats to update attention
	// stats in the DB for each post on the tag page.
	dispose: (RankedPosts, tag, _reason) => {
		flushTagPageStats(tag, RankedPosts)
	},
})

export async function invalidateTagPage(tag: string) {
	const RankedPosts = rankingsCache.get(tag)!
	if (RankedPosts !== undefined) {
		await flushTagPageStats(tag, RankedPosts)
	}

	rankingsCache.delete(tag)
}

export async function clearRankingsCache() {
	let keys = rankingsCache.keys()
	for (let tag of keys) {
		rankingsCache.delete(tag)
	}
}

// async function getPostsWithStats(tagId: number): Promise<PostWithStats[]> {
// 	// Select all posts, along with vote tallies and attention
// 	let query = db
// 		.selectFrom('Post')
// 		.innerJoin('Tally', 'Tally.postId', 'Post.id')
// 		.where('Tally.tagId', '=', tagId)
// 		.where('Post.parentId', 'is', null)
// 		.leftJoin('PostStats', join =>
// 			join
// 				.onRef('PostStats.postId', '=', 'Post.id')
// 				.on('PostStats.tagId', '=', tagId),
// 		)
// 		.select(sql<number>`COALESCE(PostStats.attention, 0)`.as('attention'))
// 		.select(sql<number>`COALESCE(Tally.total, 0)`.as('voteTotal'))
// 		.select(sql<number>`COALESCE(Tally.count, 0)`.as('voteCount'))
// 		.select(sql<number>`replies`.as('nReplies'))
// 		.selectAll('Post')
// 		.orderBy('attention', 'asc')

// 	let allPosts: PostWithStats[] = await query.execute()

// 	return allPosts
// }

export async function getScoredPost(
	tag: string,
	postId: number,
): Promise<ScoredPost> {
	const tagId = await getOrInsertTagId(tag)
	return getScoredPostInternal(tagId, postId)
}

async function getScoredPostInternal(
	tagId: number,
	postId: number,
): Promise<ScoredPost> {
	let query = db
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.selectAll('Post')
		.selectAll('FullScore')
		.select(sql<number>`replies`.as('nReplies'))
		.where('Post.id', '=', postId)
		.where('FullScore.tagId', '=', tagId)

	const scoredPost = (await query.execute())[0]

	if (scoredPost === undefined) {
		throw new Error(`Failed to read scored post tagId=${tagId} postId=${postId}`)
	}

	return {
		...scoredPost,
		effectOnParent: await getEffectOnParent(tagId, postId),
	}
}

export async function getTopNote(
	tag: string,
	post: ScoredPost,
	// postId: number,
): Promise<ScoredNote | null> {
	const tagId = await getOrInsertTagId(tag)
	return post.topNoteId !== null ? getScoredNoteInternal(tagId, post.topNoteId) : null
}

async function getScoredNoteInternal(
	tagId: number,
	postId: number,
): Promise<ScoredNote> {
	let query = db
		.selectFrom('Post')
		.innerJoin('Effect', join =>
			join
				.on('Effect.tagId', '=', tagId)
				.on('Effect.noteId', '=', postId)
				.onRef('Effect.postId', '=', 'Post.parentId')
		)
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.selectAll('Post')
		.selectAll('Effect')
		.select(sql<number>`replies`.as('nReplies'))
		.where('Post.id', '=', postId)

	const scoredNote = (await query.execute())[0]

	if (scoredNote === undefined) {
		throw new Error(`Failed to read scored post tagId=${tagId} postId=${postId}`)
	}

	return scoredNote
}

export async function getRankedPosts(tag: string): Promise<RankedPosts> {
	const tagId = await getOrInsertTagId(tag)

	let query = db
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.selectAll('Post')
		.selectAll('FullScore')
		.select(sql<number>`replies`.as('nReplies'))
		.where('FullScore.tagId', '=', tagId)
		.orderBy('FullScore.score', 'desc')
		.limit(MAX_RESULTS)

	const scoredPosts: ScoredPost[] = await query.execute()

	const rankedPosts: RankedPost[] = await Promise.all(
		scoredPosts.map(async (post: ScoredPost) => {
			return {
				...post,
				note: post.topNoteId == null ? null : await getScoredNoteInternal(tagId, post.topNoteId!),
				parent: post.parentId == null ? null : await getPost(post.parentId!),
				random: false,
			}
		}),
	)

	// {
	// 	...post,
	// }

	return {
		posts: rankedPosts,
		effectiveRandomPoolSize: 0,
	}
}

// export async function getRandomlyRankedPosts(
// 	tag: string,
// ): Promise<RankedPosts> {
// 	return {
// 		posts: [],
// 		effectiveRandomPoolSize: 0,
// 	}
// }

export async function getRankedReplies(
	tag: string,
	postId: number,
): Promise<RankedPosts> {
	const tagId = await getOrInsertTagId(tag)
	let query = db
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.selectAll('Post')
		.selectAll('FullScore')
		.select(sql<number>`replies`.as('nReplies'))
		.where('FullScore.tagId', '=', tagId)
		.where('Post.parentId', '=', postId)
		.orderBy('FullScore.score', 'desc')
		.limit(MAX_RESULTS)

	const scoredPosts: ScoredPost[] = await query.execute()

	const thisPost = await getPost(postId)

	const rankedPosts: RankedPost[] = await Promise.all(
		scoredPosts.map(async (post: ScoredPost) => {
			return {
				...post,
				note: post.topNoteId == null ? null : await getScoredNoteInternal(tagId, post.topNoteId!),
				parent: thisPost, // We don't really need this but the RankedPost type requires it.
				random: false,
			}
		}),
	)

	return {
		posts: rankedPosts,
		effectiveRandomPoolSize: 0,
	}
}

export async function getRankedTags(): Promise<string[]> {
	return []
}

export type TagPreview = {
	tag: string
	posts: RankedPost[]
	positions: Position[]
}

export async function getUserFeed(userId: string): Promise<TagPreview[]> {
	assert(userId !== '', 'missing user ID')
	let feed = await getDefaultFeed()

	for (let tagPreview of feed) {
		const { tag, posts } = tagPreview
		logTagPreview(userId, tag)
		let positions = await getUserPositions(
			userId,
			tag,
			posts.map(p => p.id),
		)
		tagPreview.positions = positions
	}

	return feed
}

export async function getDefaultFeed(): Promise<TagPreview[]> {
	let feed: TagPreview[] = []

	let tags: string[] = await getRankedTags()

	for (let tag of tags) {
		let posts: RankedPost[] = (await getRankedPosts(tag)).posts.slice(0, 2)

		if (posts.length == 0) {
			continue
		}

		// console.log("Posts", tag, posts)
		feed.push({ tag, posts, positions: [] })
	}

	return feed
}
