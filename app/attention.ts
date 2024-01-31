import assert from 'assert'
import { sql } from 'kysely'
import { type TagStats } from '#app/db/types.ts'
import { db } from '#app/db.ts'

import { GammaDistribution } from './beta-gamma-distribution.ts'
import { initPostStats } from './post.ts'
import { MAX_RESULTS, type RankedPosts } from './ranking.ts'
import { getOrInsertTagId } from './tag.ts'

// Global prior votes/view. The TagStats table keeps track of votes/view per tag, but
// we need to start with some prior. This value is currently just a wild guess.
export const GLOBAL_PRIOR_VOTES_PER_VIEW = new GammaDistribution(0.002, 10000)
export const RANDOM_POOL_SIZE = 0.25

export enum LocationType {
	NewPost = 0,
	TagPage = 1,
	PostReplies = 2,
}

export type Location = {
	locationType: LocationType
	oneBasedRank: number
}

type TagStatsAccumulator = {
	filter: Map<String, boolean>
	views: number
	votes: number
	previews: number
}

let statsForTag = new Map<string, TagStatsAccumulator>()

function getOrCreateStatsForTag(tag: string): TagStatsAccumulator {
	let stats = statsForTag.get(tag)

	if (stats == undefined) {
		// console.log("Not stats for tag", tag)
		// let filter = new bloomFilters.BloomFilter(bits, hashes)
		let filter = new Map<string, boolean>()
		stats = { filter: filter, views: 0, votes: 0, previews: 0 }
		statsForTag.set(tag, stats)
	}
	return stats
}

export function logTagVote(tag: string) {
	let stats = getOrCreateStatsForTag(tag)

	stats.votes += 1
}

export async function logPostPageView(
	_tag: string,
	_postId: number,
	_userId: string | null,
	_topNoteId: number | null,
) {
	// todo
}

export function logTagPreview(userId: string, tag: string) {
	let stats = getOrCreateStatsForTag(tag)
	let filter = stats.filter
	let key = userId

	if (!filter.has(key)) {
		filter.set(key, true)
		stats.previews += 1
	}
}

export function logTagPageView(
	userId: string,
	tag: string,
	rankedPosts: RankedPosts,
) {
	let stats = getOrCreateStatsForTag(tag)

	let filter = stats.filter
	let key = userId

	if (!filter.has(key)) {
		filter.set(key, true)
		stats.views += 1
	}
}

export async function flushTagPageStats(tag: string, rankedPosts: RankedPosts) {
	assert(rankedPosts.posts, 'rankedPosts.posts')
	// assert(rankedPosts.posts.length > 0, 'rankedPosts.posts.length > 0')
	const posts = rankedPosts.posts
	let tagId = await getOrInsertTagId(tag)

	let deltaViews = 0
	let deltaVotes = 0

	let stats = statsForTag.get(tag)
	if (stats != undefined) {
		deltaViews = stats.views
		deltaVotes = stats.votes
	}

	if (deltaViews == 0) {
		if (deltaVotes != 0) {
			console.log('deltaViews == 0 but deltaVotes =', deltaVotes)
		}
		return
	}

	const weightedDeltaViews = deltaViews * rankedPosts.effectiveRandomPoolSize

	const prior = GLOBAL_PRIOR_VOTES_PER_VIEW.update({
		count: deltaVotes,
		total: weightedDeltaViews,
	})

	let votesPerView = 0
	// Update tag stats, including total votes, views, and a moving average votesPerView
	{
		let movingAverageAlpha = 0.99999
		let windowSize = 1 / (1 - movingAverageAlpha)

		let decayFactor = movingAverageAlpha ** weightedDeltaViews

		const query = db
			.insertInto('TagStats')
			.values({
				tagId: tagId,
				views: prior.weight,
				votesPerView: prior.mean,
			})
			.onConflict(oc =>
				oc.column('tagId').doUpdateSet({
					views: eb => eb('views', '+', weightedDeltaViews),
					votesPerView: sql<number>`
						case 
						when views < ${windowSize} || ${weightedDeltaViews} == 0 then
							(votesPerView*views + ${deltaVotes}) / (views + ${weightedDeltaViews})
						else 
							votesPerView * ${decayFactor} + ${deltaVotes}/${weightedDeltaViews}*(1 - ${decayFactor})
						end
					`,
				}),
			)
			.returningAll()

		const result = await query.execute()

		// console.log(
		// 	'REturned value from update tag stats',
		// 	'weightedDeltaViews',
		// 	weightedDeltaViews.toFixed(1),
		// 	'deltaVotes',
		// 	deltaVotes,
		// 	'rankedPosts.effectiveRandomPoolSize',
		// 	rankedPosts.effectiveRandomPoolSize,
		// 	'votesPerView',
		// 	result[0]!.votesPerView.toFixed(5),
		// 	'views',
		// 	result[0]!.views.toFixed(3),
		// 	'votes',
		// 	(result[0]!.votesPerView * result[0]!.views).toFixed(1),
		// 	'deltaVotes/weightedDeltaViews',
		// 	(deltaVotes / weightedDeltaViews).toFixed(3),
		// )
		votesPerView = result[0]!.votesPerView
	}

	// instead of using actual deltaVotes, use votesPerView*weightedDeltaViews, which is equal to deltaVotes
	// on average, but will be "smoother".
	let deltaAttention = votesPerView * deltaViews

	// console.log(
	// 	'Saving post stats',
	// 	votesPerView,
	// 	weightedDeltaViews,
	// 	deltaAttention,
	// )

	// Update individual post stats
	for (let i = 0; i < posts.length; i++) {
		await savePostStats(
			tagId,
			posts[i]!.id,
			{ locationType: LocationType.TagPage, oneBasedRank: i + 1 },

			deltaAttention,
		)
	}

	statsForTag.delete(tag)
}

export async function logAuthorView(
	_userId: string,
	tagId: number,
	postId: number,
) {
	await savePostStats(
		tagId,
		postId,
		{ locationType: LocationType.NewPost, oneBasedRank: 1 },
		1,
	)
}

async function savePostStats(
	tagId: number,
	postId: number,
	location: Location,
	deltaAttention: number,
) {
	await initPostStats(tagId, postId)

	// if (postId === 2803) {
	// 	console.log('Updating post stats', tagId, postId, location, deltaAttention)
	// }

	const _result = await db
		.updateTable('PostStats')
		.from('LocationStats')
		// .from('TagStats')
		.set(({ eb, ref }) => ({
			attention: eb(
				'attention',
				'+',
				eb(ref('voteShare'), '*', deltaAttention),
			),
			views: eb('views', '+', 1),
		}))
		.where('LocationStats.locationType', '=', location.locationType)
		.where('LocationStats.oneBasedRank', '=', location.oneBasedRank)
		// .where('TagStats.tagId', '=', tagId)
		.where('PostStats.tagId', '=', tagId)
		.where('PostStats.postId', '=', postId)
		.returningAll()
		.execute()

	return
}

/*

logVoteOnRandomlyRankedPost is a key part of to our attention model.

In order to estimate the information rate for a post, we track the cumulative
attention for each post using a method similar to the one described in the
[Quality News Readme](https://github.com/social-protocols/news/blob/master/README.md).

But in this case, since we have both upvotes and downvotes, attention is
expected votes (not upvotes) -- the number of votes we would expect
the *average* post to receive if it had this post's history. To calculate
this, we need to know how many votes to expect per post-view as a function of
the location at which a post was viewed (e.g. what sort of page or mobile
view it is shown on, at what rank).

To calculate this, we need to estimate the expected votes at each location.
But we can't do this simply by counting votes at each location, because there
is a confounding factor: Do posts at top ranks because get more votes because
of the effect on rank (.e.g.users pay more attention to posts at top ranks),
or because the post themselves are more voteable?

Do de-confound, we do a good old fashioned randomized experiment. With a some
probability (e.g. 5-10%), the post at each rank is selected randomly (and not
based on the information-optimization algorithm). Then, when there is a vote
for one of these randomly-selected posts, we record it, counting the number
of votes at each location. Dividing by the total impressions gives us the
expected votes per impression at each location -- or the deltaAttention
(per impression) at each location

The logVoteOnRandomlyRankedPost function below updates this aggregate given a
location.



*/

// This needs to be quite small. We want to use an exponentially weighted moving average to detect the gradual changes in user behavior over time
// But we want the moving average window to be quite big so as to have more accurate data. Especially for locations/ranks where we don't get
// a lot of data.
const movingAverageAlpha = 0.9999
const windowSize = 1 / (1 - movingAverageAlpha)
const startingSitewideVotes = 1000

export async function logVoteOnRandomlyRankedPost(location: Location) {
	let q = db
		.updateTable('ExplorationStats')
		.set(eb => ({
			votes: eb('votes', '+', 1),
			// votes: sql<number>`excluded.votes + 1`  // increment votes by 1
		}))
		.returning('votes')

	let result = await q.execute()

	if (result.length == 0) {
		await seedStats()
		result = await q.execute()
	}

	const sitewideVotes: number = result[0]!.votes

	const query = db
		.updateTable('LocationStats')
		.where('locationType', '=', location.locationType as number)
		.where('oneBasedRank', '=', location.oneBasedRank)
		.set(() => ({
			// votes: eb(eb(sitewideVotes, '-', 'sitewideVotes'), '+', 1)
			// votes: sql<number>`excluded.votes + 1`  // increment votes by 1

			// this calculates an exponentially weighted moving average
			// voteShare: sql<number>`voteShare * pow(${movingAverageAlpha}, ${sitewideVotes} - latestSitewideVotes) + (1 - ${movingAverageAlpha})`,

			// this calculates an overage average
			// voteShare: sql<number>`(voteShare * latestSitewideVotes + 1) / ${sitewideVotes}`,

			// this calculates overall average until there are ${windowSize} sitewide votes, then
			// switches to an expontentially weighted moving average.
			voteShare: sql<number>`
				case when ${sitewideVotes} < ${windowSize} then 
					(voteShare * latestSitewideVotes + 1) / ${sitewideVotes}
				else 
					voteShare * pow(${movingAverageAlpha}, ${sitewideVotes} - latestSitewideVotes) + (1 - ${movingAverageAlpha})
				end
				`,
			latestSitewideVotes: sitewideVotes,
		}))
		.returningAll()

	await query.execute()
}

// Seed locationStats with a good guess about the relative number of votes at each location
export async function seedStats() {
	await db.deleteFrom('ExplorationStats').execute()
	await db.deleteFrom('LocationStats').execute()

	const startingSitewideVotes = 1000
	// const startingSitewideViews = 1000
	db.insertInto('ExplorationStats')
		.values({ votes: startingSitewideVotes })
		.onConflict(oc => oc.doNothing())
		.execute()

	// Rough guess of vote share at position 1 just for seeding.
	const rankOneVoteShare = 0.08
	let locationType = LocationType.TagPage

	// loop i from 1 to 90
	for (let i = 1; i <= MAX_RESULTS; i++) {
		let oneBasedRank = i
		let voteShare = rankOneVoteShare / oneBasedRank

		await db
			.insertInto('LocationStats') // replace with your actual table name
			.values({
				locationType: locationType as number,
				oneBasedRank: oneBasedRank,
				voteShare: voteShare, // Initial vote count for a new entry
				latestSitewideVotes: startingSitewideVotes, // Indicates strength of our prior about the voteShare per location
			})
			.execute()

		// set sitewideUpvotes
	}
}

export async function tagStats(tag: string): Promise<TagStats> {
	let tagId = await getOrInsertTagId(tag)

	return await db
		.selectFrom('TagStats')
		.where('tagId', '=', tagId)
		.selectAll()
		.executeTakeFirstOrThrow()
}
