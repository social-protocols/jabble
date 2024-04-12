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

// const fatigueFactor = .9
// const attentionCutoff = 2 // Note all posts start with 1 unit of attention (from poster)

export const MAX_RESULTS = 100

export type RankedPost = ScoredPost & {
	random: boolean
	note: Post | null
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

	const scoredPost: ScoredPost = (await query.execute())[0]!

	console.log('Got score post', scoredPost)

	return scoredPost
}

export async function getTopNote(
	tagId: number,
	post: ScoredPost,
	// postId: number,
): Promise<Post | null> {
	// TODO: this is a placeholder
	return null
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
				note: post.topNoteId == null ? null : await getPost(post.topNoteId!),
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

export async function getRandomlyRankedPosts(
	tag: string,
): Promise<RankedPosts> {
	return {
		posts: [],
		effectiveRandomPoolSize: 0,
	}
}

// async function rankPosts(
// 	tagId: number,
// 	allPosts: PostWithStats[],
// ): Promise<RankedPosts> {

// 	return {
// 		posts: [],
// 		effectiveRandomPoolSize: 0,
// 	}
// }

// export async function totalInformationGain(tagId: number): Promise<number> {
// 	let allPosts = await getPostsWithStats(tagId)
// 	// console.log("All posts", allPosts.length, tagId)

// 	// Then score each post
// 	let informationGain = await Promise.all(
// 		allPosts.map(async post => {
// 			let s = await score(tagId, post)

// 			let informationGain = s.voteTotal * s.informationValue
// 			// console.log("Information gain ", post.id, s.voteTotal, s.q, s.informationValue)
// 			return informationGain
// 		}),
// 	)

// 	return informationGain.reduce((sum, current) => sum + current, 0)
// }

export async function getRankedReplies(
	tag: string,
	postId: number,
): Promise<RankedPosts> {
	return {
		posts: [],
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

// function shuffleArray<T>(array: T[]) {
// 	for (let i = array.length - 1; i > 0; i--) {
// 		const j = Math.floor(Math.random() * (i + 1))
// 		;[array[i], array[j]] = [array[j]!, array[i]!]
// 	}
// }
