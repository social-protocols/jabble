import assert from 'assert'
import { sql } from 'kysely'
import { LRUCache } from 'lru-cache'
import { type Post } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
// import { cumulativeAttention } from './attention.ts';
import {
	RANDOM_POOL_SIZE,
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
const attentionCutoff = 2 // Note all posts start with 1 unit of attention (from poster)

export const MAX_RESULTS = 100

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
	dispose: (rankedPosts, tag, _reason) => {
		flushTagPageStats(tag, rankedPosts)
	},
})

export async function invalidateTagPage(tag: string) {
	const rankedPosts = rankingsCache.get(tag)!
	if (rankedPosts !== undefined) {
		await flushTagPageStats(tag, rankedPosts)
	}

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

export async function getRankedPosts(tag: string): Promise<RankedPosts> {
	let tagId = await getOrInsertTagId(tag)

	let result = rankingsCache.get(tag)
	if (result == undefined) {
		let allPosts = await getPostsWithStats(tagId)

		const rankedPosts = await rankPosts(tagId, allPosts)
		result = {
			posts: rankedPosts,
			effectiveRandomPoolSize:
				rankedPosts.filter(p => p.random).length / rankedPosts.length,
		}
		rankingsCache.set(tag, result)
	}
	// logTagPageView(userId, tag)

	return result
}

export async function getRandomlyRankedPosts(
	tag: string,
): Promise<RankedPosts> {
	let tagId = await getOrInsertTagId(tag)

	let result = rankingsCache.get(tag)
	if (result == undefined) {
		let allPosts: PostWithStats[] = await getPostsWithStats(tagId)

		const rankedPosts = await Promise.all(
			allPosts.slice(0, MAX_RESULTS).map(async (p, i) => {
				const s = await score(tagId, p)
				return {
					oneBasedRank: i + 1,
					random: true,
					note: null,
					...p,
					...s,
				}
			}),
		)
		shuffleArray(rankedPosts)
		result = {
			posts: rankedPosts,
			effectiveRandomPoolSize: 1,
		}
		rankingsCache.set(tag, result)
	}
	// logTagPageView(userId, tag)

	return result
}

async function rankPosts(
	tagId: number,
	allPosts: PostWithStats[],
): Promise<RankedPost[]> {
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

	let sortedPosts = scoredPosts
		.filter(p => p.informationValue > 0 || p.attention < attentionCutoff)
		.sort((a, b) => {
			return b.score - a.score
		})

	let nPosts = sortedPosts.length

	let rankablePosts = sortedPosts.filter(p => p.attention >= attentionCutoff)
	let nRankablePosts = rankablePosts.length

	// let randomPosts = scoredPosts.filter(p => p.attention < attentionCutoff)
	// let nRandomPosts = randomPosts.length

	let nResults = nPosts
	if (nResults > MAX_RESULTS) {
		nResults = MAX_RESULTS
	}

	// console.log("Number of posts", nResults, nPosts, nRandomPosts, nRankablePosts)

	// Finally, create nResults results by iterating through the ranked posts
	// while randomly inserting posts from the random pool (with a
	// probability of RANDOM_POOL_SIZE) at each rank. When we run out of
	// ranked posts, return random posts from the random pool until we
	// have nResults total posts.

	let results: RankedPost[] = Array(nResults)

	let nRankedPosts = 0
	let nRandomPosts = 0

	let randomlySortedPosts = scoredPosts.map((_p, i) => i)
	shuffleArray(randomlySortedPosts)
	let randomlySelectedPosts = new Set<number>()
	let randomPosts: number[] = Array(nResults)

	let randoms = [...Array(nResults).keys()]
	shuffleArray(randoms)
	randoms = randoms.slice(0, RANDOM_POOL_SIZE * nResults)
	randoms.forEach((rank, i) => {
		let randomPostNum = randomlySortedPosts[i]!
		nRandomPosts += 1
		randomPosts[rank] = randomPostNum
		randomlySelectedPosts.add(randomPostNum)
	})

	// First, choose which ranks will show a random post, and which post will be randomly shown
	// console.log(
	// 	'Random pool ranking',
	// 	nResults,
	// 	randomPosts,
	// 	randomlySelectedPosts,
	// )

	// Now create the final ranking by iterating over each rank and:
	// - Using the random post, if there is one
	// - Use the next rankable posts -- if it is has not been selected as a random post
	let nextRankedPostNum = 0
	for (let i = 0; i < nResults; i++) {
		let random = false
		let p = null
		let postNum: number | null = null
		if (randomPosts[i] !== undefined) {
			random = true
			postNum = randomPosts[i]!
		} else if (nRankedPosts + nRandomPosts >= nRankablePosts) {
			// If we have run out of rankable posts, select more
			// random posts to fill in.
			random = true

			let randomPostNum = randomlySortedPosts[nRandomPosts]!
			nRandomPosts += 1

			// console.log(
			// 	'Random fill',
			// 	i,
			// 	nRankedPosts,
			// 	nRandomPosts,
			// 	nRankablePosts,
			// 	randomPostNum,
			// )

			postNum = randomPostNum
		} else {
			while (
				randomlySelectedPosts.has(nextRankedPostNum) ||
				sortedPosts[nextRankedPostNum]!.attention < attentionCutoff
			) {
				nextRankedPostNum += 1
			}
			// console.log('NExt ranked post', nextRankedPostNum, nRankedPosts)
			nRankedPosts++
			assert(nRankedPosts <= nRankablePosts)
			postNum = nextRankedPostNum
			nextRankedPostNum++
		}
		// console.log('i, postNum', i, postNum, random, nPosts)
		randomPosts[i] = postNum
		assert(postNum !== null, `postNum is null`)

		p = sortedPosts[postNum]
		if (p == undefined) {
			console.log(
				i,
				randomPosts,
				postNum,
				nRankedPosts,
				nRankablePosts,
				nRandomPosts,
				nextRankedPostNum,
			)
			assert(p !== undefined, `p is undefined`)
		}

		let s = { oneBasedRank: i + 1, random: random }

		let note = await getTopNote(tagId, p)

		// p.topNoteId !== null
		// 	? await db
		// 			.selectFrom('Post')
		// 			.where('Post.id', '=', p.topNoteId)
		// 			.selectAll()
		// 			.executeTakeFirstOrThrow()
		// 	: null

		results[i] = { ...p, ...s, note }
	}
	// console.log('Final ranking', randomPosts)

	return results
}

async function score(tagId: number, post: PostWithStats): Promise<ScoreData> {
	// find informed probability

	let [topNoteId, p, q] = await findTopNoteId(tagId, post.id)

	// https://social-protocols.org/y-docs/information-value.html
	let informationValuePerVote = 1 + Math.log2(p)

	let informationValue = post.voteTotal * informationValuePerVote

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
	let informationRate = voteRate * informationValuePerVote

	if (topNoteId == null) {
		const topNote = await db
			.selectFrom('Post')
			.where('Post.parentId', '=', post.id)
			.select(['id'])
			.orderBy(sql`RANDOM()`)
			.executeTakeFirst()
		topNoteId = (topNote && topNote.id) || null
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

export async function getTopNote(
	tagId: number,
	post: ScoredPost,
	// postId: number,
): Promise<Post | null> {
	// With a certain probability, select a random note
	// if (Math.random() < RANDOM_POOL_SIZE) {
	if (true) {
		// Select random note under this post, that has at least one vote for this tag Id.
		const randomNote: Post | undefined = await db
			.selectFrom('Post')
			.leftJoin('CurrentTally', 'postId', 'Post.id')
			.where('CurrentTally.tagId', '=', tagId)
			.where('parentId', '=', post.id)
			.selectAll()
			.orderBy(sql`RANDOM()`)
			.limit(1)
			.executeTakeFirst()

		return randomNote || null
	}

	const noteId = post.topNoteId

	// const [noteId, _p, _q] = await findTopNoteId(tagId, postId)

	console.log('Found top note id', noteId)

	if (noteId == 0) {
		return null
	}

	const note: Post | undefined = await db
		.selectFrom('Post')
		.where('id', '=', noteId)
		.selectAll()
		.executeTakeFirst()

	return note || null
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

function shuffleArray<T>(array: T[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j]!, array[i]!]
	}
}
