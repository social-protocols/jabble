import { db } from "#app/db.ts";
import { type Post } from '#app/db/types.ts'; // this is the Database interface we defined earlier
import { sql } from 'kysely';
// import { cumulativeAttention } from './attention.ts';
import { findTopNoteId, GLOBAL_PRIOR_VOTE_RATE } from './probabilities.ts';
import { getOrInsertTagId } from './tag.ts';
import { saveTagPageStats } from './attention.ts'

import assert from 'assert';


type ScoreData = {
	attention: number,
	p: number,
	q: number,
	score: number,
	voteRate: number,
	voteTotal: number,
	voteCount: number,
	informationValue: number,
	informationRate: number,
}

export type RankedPost = Post & ScoreData & { explorationPool: boolean }
type PostWithStats = Post & { attention: number, voteCount: number, voteTotal: number }

// const fatigueFactor = .9
const explorationPoolSize = .1
const attentionCutoff = 2 // Note all posts start with 1 unit of attention (from poster)


import { LRUCache } from 'lru-cache'

let rankingsCache = new LRUCache<string, RankedPost[]>({
	max: 100,
	ttl: 1000 * 60, // one minute

	// automatically purge items from cache when ttl is exceeded
	// we want to do this so that savePageStats is called to save attention stats in the DB
	// roughly once a minute.

	ttlAutopurge: true,

	// when we dispose of the page from the cache, call saveTagPageStats to update attention
	// stats in the DB for each post on the tag page.
	dispose: (posts, tag, reason) => {
		saveTagPageStats(tag, posts.map(p => p.id))	
	},
}) 

export async function getRankedPosts(tag: string, maxResults: number): Promise<RankedPost[]> {

	let result = rankingsCache.get(tag)
	if (result == undefined) {
		result = await getRankedPostsInternal(tag, maxResults)
		rankingsCache.set(tag, result)
	} 

	return result
}


async function getRankedPostsInternal(tag: string, maxResults: number): Promise<RankedPost[]> {

	let tagId = await getOrInsertTagId(tag)

	// Select all posts, along with vote tallies and attention
	let query = db
		.selectFrom('Post')
		.innerJoin('CurrentTally', 'CurrentTally.postId', 'Post.id')
		.where('CurrentTally.tagId', '=', tagId)
		.where('Post.parentId', 'is', null)
		.leftJoin(
			'PostStats',
			(join) => join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId)
		)
		.select(
			sql<number>`COALESCE(PostStats.attention, 0)`.as('attention')
		).select(
			sql<number>`COALESCE(CurrentTally.total, 0)`.as('voteTotal')
		).select(
			sql<number>`COALESCE(CurrentTally.count, 0)`.as('voteCount'),
		)
		.selectAll('Post')
		.orderBy('attention', 'asc')
		;

	let allPosts: PostWithStats[] = await query.execute()
	let nPosts = allPosts.length

	// Then score each post
	let scoredPosts = await Promise.all(allPosts.map(async post => {
		let s = await score(tag, post)

		return {
			...post, ...s
		}
	}))


	// Then split into two pools: rankedPosts, and explorationPosts, based on
	// whether cumulative attention is above or below the cutoff.

	let rankedPosts = scoredPosts
		.filter(p => p.attention >= attentionCutoff)
		.sort((a, b) => { return b.score - a.score })
	let nRankedPosts = rankedPosts.length

	let explorationPosts = scoredPosts.filter(p => p.attention < attentionCutoff)
	let nExplorationPosts = explorationPosts.length


	let nResults = nPosts
	if (nResults > maxResults) {
		nResults = maxResults
	}

	console.log("Number of posts",nResults, nPosts, nExplorationPosts, nRankedPosts)

	// Finally, create nResults results by iterating through the ranked posts
	// while randomly inserting posts from the exploration pool (with a
	// probability of explorationPoolSize) at each rank. When we run out of
	// ranked posts, return random posts from the exploration pool until we
	// have nResults total posts.

	let results: RankedPost[] = Array(nResults)
	let nInsertions = 0
	for (let i = 0; i < nResults; i++) {

		let ep
		let p = null

		if (i < nRankedPosts && Math.random() > explorationPoolSize || nExplorationPosts == 0) {
			p = rankedPosts[i - nInsertions]
			// console.log("Taking post ranked", i, i - nInsertions)
			ep = false
		} else {
			assert(nExplorationPosts > 0, "nExplorationPosts > 0") // this must be true if my logic is correct. But is my logic correct.
			let randomPostNum = Math.floor(Math.random() * nExplorationPosts)
			// console.log("Taking random post", i, nExplorationPosts, randomPostNum)
			p = explorationPosts[randomPostNum]
			explorationPosts.splice(randomPostNum, 1)
			nExplorationPosts--
			assert(nExplorationPosts == explorationPosts.length, "nExplorationPosts == explorationPosts.length")
			nInsertions += 1
			ep = true
		}

		let s = { oneBasedRank: i + 1, explorationPool: ep };

		results[i] = { ...p, ...s }
	}


	return results
}


async function score(tag: string, post: PostWithStats): Promise<ScoreData> {
	// find informed probability

	let tagId = await getOrInsertTagId(tag)



	const [_topNoteId, p, q] = await findTopNoteId(tagId, post.id);

	// https://social-protocols.org/y-docs/information-value.html
	let informationValue = (1 + Math.log2(q))

	let voteRate = GLOBAL_PRIOR_VOTE_RATE.update({ count: post.voteTotal, total: post.attention }).average


	// The formula below gives us attention adjusted for fatigue. 
	// Our decay model says that effective attention (e.g. the vote rate) decays exponentially, so the *derivative* of the formula below
	// should be e**(-fatigueFactor*a). So the function below starts at being roughly equal to a but then as a increases
	// it levels off.
	// let adjustedAttention = (1 - Math.exp(-fatigueFactor * a)) / fatigueFactor

	// This is our ranking score!
	let informationRate = voteRate * informationValue


	if(post.id == 10) {
		console.log("Stats for post 10", post, p, q, voteRate, informationValue)
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
		score: informationRate
	}
}


// Exploration Pool Logic:
//     R% of impressions at each rank are exploration pool
//     so for each rank, exploration impression with probability of R
//     randomly choose post from exploration pool
//         exploration pool is posts with less than certain amount of attention
//             or better, with a certain confidence interval
//     increment impression count at that rank
//     increment cumulative attention of post
//     create link that has eRank of eImpression
//     log eVote when 
//     weight factors is just average of eVote / eImpression group by rank


// }





