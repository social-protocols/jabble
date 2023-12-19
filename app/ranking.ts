import assert from 'assert'
import { sql } from 'kysely'
import { LRUCache } from 'lru-cache'
import { type Post } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
// import { cumulativeAttention } from './attention.ts';
import {
	// logTagPageView,
	logTagPreview,
	flushTagPageStats,
} from './attention.ts'
import { getUserPositions, type Position } from './positions.ts'
import { GLOBAL_PRIOR_VOTE_RATE, findTopNoteId } from './probabilities.ts'
import { getOrInsertTagId } from './tag.ts'

type ScoreData = {
	attention: number
	p: number
	q: number
	score: number
	voteRate: number
	voteTotal: number
	voteCount: number
	informationValue: number
	informationRate: number
	topNoteId: number | null
	nReplies: number
}

export type ScoredPost = Post & ScoreData

export type RankedPost = Post &
	ScoreData & { random: boolean; note: Post | null }

type PostWithStats = Post & {
	attention: number
	voteCount: number
	voteTotal: number
	nReplies: number
}

// const fatigueFactor = .9
const randomPoolSize = 0.1
const attentionCutoff = 2 // Note all posts start with 1 unit of attention (from poster)

export const MAX_RESULTS = 90

let rankingsCache = new LRUCache<string, RankedPost[]>({
	max: 100,
	ttl: 1000 * 60, // one minute

	// automatically purge items from cache when ttl is exceeded
	// we want to do this so that savePageStats is called to save attention stats in the DB
	// roughly once a minute.

	ttlAutopurge: true,

	// when we dispose of the page from the cache, call flushTagPageStats to update attention
	// stats in the DB for each post on the tag page.
	dispose: (posts, tag, _reason) => {
		flushTagPageStats(
			tag,
			posts.map(p => p.id),
		)
	},
})

export async function clearRankingsCacheForTagPage(tag: string) {
	rankingsCache.delete(tag)
}

export async function clearRankingsCache() {
	let keys = rankingsCache.keys()
	for (let tag of keys) {
		rankingsCache.delete(tag)
	}
}

async function getPostsWithStats(tagId: number): Promise<PostWithStats[]> {
	// Select all posts, along with vote tallies and attention
	let query = db
		.selectFrom('Post')
		.innerJoin('CurrentTally', 'CurrentTally.postId', 'Post.id')
		.where('CurrentTally.tagId', '=', tagId)
		.where('Post.parentId', 'is', null)
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.select(sql<number>`COALESCE(PostStats.attention, 0)`.as('attention'))
		.select(sql<number>`COALESCE(CurrentTally.total, 0)`.as('voteTotal'))
		.select(sql<number>`COALESCE(CurrentTally.count, 0)`.as('voteCount'))
		.select(sql<number>`replies`.as('nReplies'))
		.selectAll('Post')
		.orderBy('attention', 'asc')

	let allPosts: PostWithStats[] = await query.execute()

	return allPosts
}

export async function getScoredPost(
	tag: string,
	postId: number,
): Promise<ScoredPost> {
	const tagId = await getOrInsertTagId(tag)
	const postWithStats: PostWithStats = await db
		.selectFrom('Post')
		.where('id', 'is', postId)
		.innerJoin('CurrentTally', 'CurrentTally.postId', 'Post.id')
		.where('CurrentTally.tagId', '=', tagId)
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.select(sql<number>`COALESCE(PostStats.attention, 0)`.as('attention'))
		.select(sql<number>`COALESCE(CurrentTally.total, 0)`.as('voteTotal'))
		.select(sql<number>`COALESCE(CurrentTally.count, 0)`.as('voteCount'))
		.select(sql<number>`replies`.as('nReplies'))
		.selectAll('Post')
		.executeTakeFirstOrThrow()

	const scoreData: ScoreData = await score(tagId, postWithStats)

	return { ...postWithStats, ...scoreData }
}

export async function getRankedPosts(tag: string): Promise<RankedPost[]> {
	let tagId = await getOrInsertTagId(tag)

	let result = rankingsCache.get(tag)
	if (result == undefined) {
		let allPosts = await getPostsWithStats(tagId)
		result = await rankPosts(tagId, allPosts)
		rankingsCache.set(tag, result)
	}
	// logTagPageView(userId, tag)

	return result
}

async function rankPosts(
	tagId: number,
	allPosts: PostWithStats[],
): Promise<RankedPost[]> {
	let nPosts = allPosts.length

	// Then score each post
	let scoredPosts = await Promise.all(
		allPosts.map(async post => {
			let s = await score(tagId, post)

			return {
				...post,
				...s,
			}
		}),
	)
	scoredPosts = scoredPosts.filter(p => p.informationValue > 0)

	// Then split into two pools: rankedPosts, and randomPosts, based on
	// whether cumulative attention is above or below the cutoff.

	let rankedPosts = scoredPosts
		.filter(p => p.attention >= attentionCutoff)
		.sort((a, b) => {
			return b.score - a.score
		})
	let nRankedPosts = rankedPosts.length

	let randomPosts = scoredPosts.filter(p => p.attention < attentionCutoff)
	let nRandomPosts = randomPosts.length

	let nResults = nPosts
	if (nResults > MAX_RESULTS) {
		nResults = MAX_RESULTS
	}

	// console.log("Number of posts", nResults, nPosts, nRandomPosts, nRankedPosts)

	// Finally, create nResults results by iterating through the ranked posts
	// while randomly inserting posts from the random pool (with a
	// probability of randomPoolSize) at each rank. When we run out of
	// ranked posts, return random posts from the random pool until we
	// have nResults total posts.

	let results: RankedPost[] = Array(nResults)
	let nInsertions = 0
	for (let i = 0; i < nResults; i++) {
		let ep
		let p = null

		if (
			(i < nRankedPosts && Math.random() > randomPoolSize) ||
			nRandomPosts == 0
		) {
			p = rankedPosts[i - nInsertions]
			// console.log("Taking post ranked", i, i - nInsertions)
			ep = false
		} else {
			assert(nRandomPosts > 0, 'nRandomPosts > 0') // this must be true if my logic is correct. But is my logic correct.
			let randomPostNum = Math.floor(Math.random() * nRandomPosts)
			// console.log("Taking random post", i, nRandomPosts, randomPostNum)
			p = randomPosts[randomPostNum]
			randomPosts.splice(randomPostNum, 1)
			nRandomPosts--
			assert(
				nRandomPosts == randomPosts.length,
				'nRandomPosts == randomPosts.length',
			)
			nInsertions += 1
			ep = true
		}
		assert(p !== undefined)
		let s = { oneBasedRank: i + 1, random: ep }

		let note =
			p.topNoteId !== null
				? await db
						.selectFrom('Post')
						.where('Post.id', '=', p.topNoteId)
						.selectAll()
						.executeTakeFirstOrThrow()
				: null

		results[i] = { ...p, ...s, note }
	}

	return results
}

async function score(tagId: number, post: PostWithStats): Promise<ScoreData> {
	// find informed probability

	let [topNoteId, p, q] = await findTopNoteId(tagId, post.id)

	// https://social-protocols.org/y-docs/information-value.html
	let informationValue = 1 + Math.log2(q)

	let voteRate = GLOBAL_PRIOR_VOTE_RATE.update({
		count: post.voteTotal,
		total: post.attention,
	}).mean

	// The formula below gives us attention adjusted for fatigue.
	// Our decay model says that effective attention (e.g. the vote rate) decays exponentially, so the *derivative* of the formula below
	// should be e**(-fatigueFactor*a). So the function below starts at being roughly equal to a but then as a increases
	// it levels off.
	// let adjustedAttention = (1 - Math.exp(-fatigueFactor * a)) / fatigueFactor

	// This is our ranking score!
	let informationRate = voteRate * informationValue

	if (topNoteId == null) {
		console.log('No top note for', post.id)
		const topNote = await db
			.selectFrom('Post')
			.where('Post.parentId', '=', 8)
			.select(['id'])
			.orderBy(sql`RANDOM()`)
			.executeTakeFirst()
		topNoteId = topNote && topNote.id
		console.log('Got random top note', post.id, topNote.id)
	}

	return {
		attention: post.attention,
		p: p,
		q: q,
		voteCount: post.voteCount,
		voteTotal: post.voteTotal,
		voteRate: voteRate,
		informationValue: informationValue,
		informationRate: informationRate,
		score: informationRate,
		topNoteId: topNoteId,
		nReplies: post.nReplies,
	}
}

export async function totalInformationGain(tagId: number): Promise<number> {
	let allPosts = await getPostsWithStats(tagId)
	// console.log("All posts", allPosts.length, tagId)

	// Then score each post
	let informationGain = await Promise.all(
		allPosts.map(async post => {
			let s = await score(tagId, post)

			let informationGain = s.voteTotal * s.informationValue
			// console.log("Information gain ", post.id, s.voteTotal, s.q, s.informationValue)
			return informationGain
		}),
	)

	return informationGain.reduce((sum, current) => sum + current, 0)
}

export async function getRankedReplies(
	tag: string,
	postId: number,
): Promise<RankedPost[]> {
	const tagId = await getOrInsertTagId(tag)

	const allNotes: PostWithStats[] = await db
		.selectFrom('Post')
		.innerJoin('CurrentTally', 'CurrentTally.postId', 'Post.id')
		.where('CurrentTally.tagId', '=', tagId)
		.where('Post.parentId', '=', postId)
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.select(sql<number>`COALESCE(PostStats.attention, 0)`.as('attention'))
		.select(sql<number>`COALESCE(CurrentTally.total, 0)`.as('voteTotal'))
		.select(sql<number>`COALESCE(CurrentTally.count, 0)`.as('voteCount'))
		.select(sql<number>`replies`.as('nReplies'))
		.selectAll('Post')
		// .limit(limit)
		.execute()

	return await rankPosts(tagId, allNotes)
}

export async function getRankedTags(): Promise<string[]> {
	let results = await db
		.selectFrom('Tag')
		.innerJoin('TagStats', 'TagStats.tagId', 'Tag.id')
		.select('tag')
		.orderBy('TagStats.votesPerView', 'desc')
		.execute()

	return results.map(row => row.tag)
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

	console.log('Tags are', tags)

	for (let tag of tags) {
		let posts: RankedPost[] = (await getRankedPosts(tag)).slice(0, 2)

		if (posts.length == 0) {
			continue
		}

		// console.log("Posts", tag, posts)
		feed.push({ tag, posts, positions: [] })
	}

	return feed
}
