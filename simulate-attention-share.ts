import assert from 'assert'
import * as cliProgress from 'cli-progress'
// @ts-ignore: https://github.com/jstat/jstat/pull/271
import jStat from 'jstat'
import {
	GLOBAL_PRIOR_VOTES_PER_VIEW,
	LocationType,
	logTagPageView,
	seedStats,
	tagStats,
} from '#app/attention.ts'
import { type Tally } from '#app/beta-gamma-distribution.ts'
import { db } from '#app/db.ts'

import { createPost } from '#app/post.ts'
import {
	getRankedPosts,
	getRandomlyRankedPosts,
	invalidateTagPage,
	//getRankedPosts,
	// totalInformationGain,
} from '#app/ranking.ts'
// import bloomFilters from 'bloom-filters';

// import { sql } from 'kysely';

import { getOrInsertTagId } from '#app/tag.ts'
import { Direction, vote } from '#app/vote.ts'

// import { SingleBar, cliProgress } from 'cli-progress'

/*
This script is used to test and validate the logic for tracking cumulative
attention for each post.

The first step is to populate the LocationStats table to calculate delta attention
for each impression at each Location. Each a location is a location type
(e.g. page or view) plus rank (e.g. order on the page).

In this simulation, we setup a scenario where the "true" attention
share(expected votes) at each location is proportional to
(1 / rank^oneBasedRankFactor), normalized so the total share adds up to one.

We then simulate a world where we have nPosts posts, each which has a
voteRate (how much more or likely that post is to be voted than average)
drawn from a log-normal distribution. We go through m time steps, and at each
time step, we generate a page with randomly sorted, then calculate the "true"
vote rate for each post given the rank it is shown at and it's voteRate.
Specifically:

	trueVoteRate = voteRate * attentionShare[location]

We then sample from a Poisson distribution with that true vote rate and
simulate that number of votes. Over time, the logic in attention.ts should
update the locationStats table so that attentionShare approximates the true
attentionShare at that location.

We then compare the estimated attentionShare in the locationStats table with
the true attention share and calculate average square error. This should be
reasonably low -- e.g. under 0.1 is probably acceptable.

We also track the cumulative attention of each post. On each impression
the delta attention for a post is the total expected votes per impression
times the vote share for the location the post was shown at.

At the end of the simulation, we compare the estimated voteRate for each post,
calculated as votes / cumulativeAttention (possibly with a constant for
Bayesian averaging). We then calculate the total error between the estimated
vote factor and the known vote factors for each post.


Use an exponentially weighted moving average in
LocationStats. There is a tradeoff in the selection of this alpha. Too big ,
and the estimates for locations at large ranks(large value of oneBasedRank)
will be way off, because we get few votes at those locations, and so the
weighted average bounces around a lot. But too big (too large a moving
average window) and the estimates don't change with time as user voting
behavior changes. As of writing it seems at least .9999 (window of
approximately 1,000 to 10,000) is necessary to get small errors. Roughly it is saying we do
calculations over the last 10k sitewide votes.


WARMUP

Before running the real simulation, run a "warmup" with a different set of
posts. The purpose of the warmup is to get accurate locationStats estimates,
without which our cumulative attention stats will be way off, resulting in
bad voteRate estimates.  


RANDOM_POOL_SIZE

 The random pool serves two purposes. One is for the system
to learn the value of the LocationStats table by inserting random posts at
different positions and seeing how many votes they get (the randomness
removes the confounding factor of the story's vote rate). But the other is
to learn the voteRates of the individual posts. 

The results of the simulation depend a great deal on the selection of
RANDOM_POOL_SIZE. It sets our exploration/exploitation tradeoff. Increasing this will 
reduce the error of our voteRate estimates, but there is some point where reducing it too much
results in too much exploring and not enough exploiting, and information gain per view
goes down. 

Once we implement Thompson sampling we would no longer need a random pool for
the second reason. We would only need a very small random pool for the first
purpose -- keeping our LocationStats table up-to-date (based on the
assumption that user behavior resulting in different attention deltas at
different ranks gradually shifts over time). The success of Thomson sampling would
be manifest in an increased information gain per view (the last output of this script).


*/

const warmupEpochs = 100
const m = 400
const nPosts = 100
const nRanks = 20
// MAX_RESULTS
// const nUsers = 10000
// const votesPerPeriod = 20

// If the actual votesPerView is very different from the global prior, then
// the initial estimates of votesPerView for a tag will be way off. This will result
// in the accumulated attention for each post possibly being way too big, which means
// and it will take a long time (without moving averaging) for the average to approach
// the true average.

const votesPerView = GLOBAL_PRIOR_VOTES_PER_VIEW.mean
const viewsPerPeriod = 10000
const votesPerPeriod = viewsPerPeriod * votesPerView

// Make this big to prevent a "fatigue" phenomenon causing a gradual reduction in vote rate,
// because the more view a post gets, the more
// likely it is that a user has already seen (and voted on) the post
const nUsers = votesPerPeriod * m
console.log('Votes per view', votesPerView, viewsPerPeriod, votesPerPeriod)

const tag = 'test' + Math.random()
const debugPostNum = null
// const debugPostNum = 1

// const m = 5
// const nPosts = 90
// const nRanks = 90
// const nUsers = 90
// const votesPerPeriod = 2

let normalizationConstant = 0
const locationType = LocationType.TagPage

// Get a normalization constant that converts the rank factor to a share of votes at each rank
for (let i = 0; i < nRanks; i++) {
	// let location = { locationType: locationType, oneBasedRank: i + 1 }
	let oneBasedRank = i + 1
	let l = rankFactor(oneBasedRank)
	normalizationConstant = normalizationConstant + l
}

function rankFactor(oneBasedRank: number): number {
	const rankExponent: number = 0.63
	return Math.pow(oneBasedRank, -rankExponent)
}

function voteShareAtRank(oneBasedRank: number): number {
	return rankFactor(oneBasedRank) / normalizationConstant
}


// TODO +flaw here: votesPerView shouldn't be constant, should increase as we put higher voteRate stories higher up
// +plus is it votesPerView or votesPerEpoch

async function simulateAttentionShare() {
	console.log(
		`Simulating ${m} time periods, ${nUsers} users, {votesPerPeriod} votes/period, {nRanks} ranks, randomly selected posts`,
	)

	await seedStats()

	assert(nPosts >= nRanks, 'nPosts >= nRanks')
	assert(nUsers >= nPosts, 'nUsers >= nPosts')

	const scoredPosts = Array.from(Array(nPosts).keys())
	const logVoteRates = scoredPosts.map(() => jStat.normal.sample(0, 0.3))
	const upvoteProbabilities = scoredPosts.map(() => Math.random())
	// const upvoteProbabilities = scoredPosts.map(() => jStat.uniform.sample(0, 1))

	// console.log('Creating sim user')
	// await db
	// 	.insertInto('User')
	// 	.values({
	// 		id: '101',
	// 		username: 'bob',
	// 		email: 'bob@test.com',
	// 		// password: { create: createPassword('bob') },
	// 	})
	// 	.onConflict(oc => oc.column('id').doNothing())
	// 	.execute()

	let tagId = await getOrInsertTagId(tag)

	console.log('Creating simulated users')
	const startingUserId = 1000
	for (let i = 0; i < nUsers; i++) {
		let userId = i + startingUserId
		await db
			.insertInto('User')
			.values({
				id: userId.toString(),
				username: 'user' + i,
				email: 'user' + i + '@test.com',
				// password: "passw0rd"
				// password: "createPassword("user" + i)"
			})
			.execute()
	}

	let totalVotes = 0

	const simulateOneEpoch = async function (
		tag: string,
		t: number,
		startPostId: number,
		random: boolean,
	) {
		let rankedPosts = random
			? await getRandomlyRankedPosts(tag)
			: await getRankedPosts(tag)

		// let tagPage = ScoredPosts.posts

		// assume all users views the tag page
		for (let i = 0; i < viewsPerPeriod; i++) {
			// let userId = ((startingUserId + i) % nUsers).toString()
			let userId = (startingUserId + (i % nUsers)).toString()
			logTagPageView(userId, tag, rankedPosts)
		}

		// for each rank
		for (let i = 0; i < nRanks; i++) {
			let oneBasedRank = i + 1

			const post = rankedPosts.posts[i]!
			let postId = post.id

			let postNumber = postId - startPostId

			// assert(postNumber != undefined, "postNumber is not undefined")
			// let postId = postIds[postNumber]

			// console.log("i, postNumber, postId", i,  postNumber, postId)

			// get the actual vote rate for this post at this rank
			let voteRate = Math.exp(logVoteRates[postNumber])
			// let rf = rankFactor(oneBasedRank)
			let voteShare = voteShareAtRank(oneBasedRank)
			// console.log("Rf", oneBasedRank, rf, voteShare)

			let actualVoteRate = votesPerPeriod * voteShare * voteRate

			assert(actualVoteRate > 0)

			// continue;
			// get a random number of votes from a Poisson distribution with the actual vote rate
			let votes = jStat.poisson.sample(actualVoteRate)

			if (postNumber == debugPostNum) {
				console.log(
					'Iteration',
					t,
					'Rank',
					oneBasedRank,
					'Post',
					postNumber,
					'voteRate',
					voteRate,
					'voteShare',
					voteShare,
					'votesPerPeriod',
					votesPerPeriod,
					'actualVoteRate',
					actualVoteRate,
					'votes',
					votes,
					'post',
					post,
				)
			}

			// console.log("Votes for rank", i, votes, actualVoteRate, voteShare, voteRate)

			// let upvoteProbability = upvoteProbabilities[postNumber]
			// let direction = Math.random() < upvoteProbability ? Direction.Up : Direction.Down
			let direction = Direction.Up

			// Log the votes
			for (let j = 0; j < votes; j++) {
				let randomLocation = post.random
					? {
							locationType: locationType,
							oneBasedRank: oneBasedRank,
					  }
					: null

				// cycle through the users when choosing a user to vote...
				let userId = (1000 + (totalVotes % nUsers)).toString()

				await vote(tag, userId, postId, null, direction, randomLocation)
				totalVotes++
			}
		}

		// update stats in the DB. Otherwise the same tag page gets server over and over gain.
		await invalidateTagPage(tag)
	}

	// First do a warmup. The purpose of the warmup is to get accurate locationStats estimates, without which
	// our cumulative attention stats will be way off, resulting in bad voteRate estimates.
	{
		console.log('Creating simulated posts')
		let minPostId = await createSimulatedPosts(tag + '-warmup', nPosts)

		const bar1 = new cliProgress.SingleBar(
			{},
			cliProgress.Presets.shades_classic,
		)
		bar1.start(warmupEpochs, 0)
		// for each period
		for (let t = 0; t < warmupEpochs; t++) {
			await simulateOneEpoch(tag + '-warmup', t, minPostId, true)
			debugPostNum == null && bar1.update(t)
		}

		bar1.stop()
	}

	// Now do the proper simulation. Since we've done the warmup, we can
	// can more or less accurately estimate cumulative attention and therefore make better voteRate estimates.
	let minPostId = await createSimulatedPosts(tag, nPosts)

	const bar2 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
	bar2.start(m, 0)
	// for each period
	for (let t = 0; t < m; t++) {
		await simulateOneEpoch(tag, t, minPostId, false)
		debugPostNum == null && bar2.update(t)
	}

	bar2.stop()

	console.log(
		'Total votes',
		totalVotes,
		'expected approximately',
		m * votesPerPeriod,
	)

	let voteShares = await db
		.selectFrom('LocationStats')
		.selectAll()
		.orderBy('oneBasedRank')
		.execute()

	// assert(voteShares.length == nRanks, 'voteShares.length == nRanks')

	let squareErrorLocations = 0
	for (let i = 0; i < nRanks; i++) {
		// let l = rankFactor(i + 1)
		let actualShare = voteShareAtRank(i + 1)
		// total = total + l
		let estimatedShare = voteShares[i]!.voteShare
		let error = (actualShare - estimatedShare) / actualShare
		console.log(
			'Location share at rank ',
			i + 1,
			'actual',
			actualShare,
			'estimated',
			estimatedShare,
			'error',
			error,
		)
		squareErrorLocations += error * error
	}

	let postStats = await db
		.selectFrom('PostStats')
		// where postId > minPostId
		.where('postId', '>=', minPostId)
		.where('tagId', '=', tagId)
		.selectAll()
		.orderBy('postId')
		.execute()

	let postTally = await db
		.selectFrom('Tally')
		.where('postId', '>=', minPostId)
		.where('tagId', '=', tagId)
		.selectAll()
		.orderBy('postId')
		.execute()

	let ts = await tagStats(tag)

	console.log('Tag stats', ts)

	let squareErrorPosts = 0
	for (let i = 0; i < nPosts; i++) {
		let postId = minPostId

		let actualVoteRate = Math.exp(logVoteRates[i])
		let stats = postStats[i]
		if (stats == undefined) {
			throw new Error(`No stats for post ${postId}`)
		}
		let a = stats.attention
		// (stats.attention - 1) * votesPerPeriod + 1

		let tally: Tally = postTally[i]!
		if (tally == undefined) {
			tally = { count: 0, total: 0 }
		}
		let t = tally.total

		// let fatigueFactor = 0.01
		// let adjustedAttention = (1 - Math.exp(-fatigueFactor * a)) / fatigueFactor
		let adjustedAttention = a
		let estimatedVoteRate = t / adjustedAttention

		let error = (actualVoteRate - estimatedVoteRate) / actualVoteRate
		console.log(
			'Vote rate for post ',
			i,
			'actual',
			actualVoteRate,
			'estimated',
			estimatedVoteRate,
			't',
			t,
			'a',
			a,
			'error',
			error * error,
		)
		squareErrorPosts += error * error
	}

	console.log(
		'Mean Square error for attentionShare at each rank',
		squareErrorLocations / nRanks,
	)
	console.log('Mean Square error for vote rate', squareErrorPosts / nPosts)

	// let totalGain = await totalInformationGain(tagId)
	// let totalViews = ts.views
	// console.log('Information gain per view', totalGain / totalViews)
}

async function createSimulatedPosts(
	tag: string,
	nPosts: number,
): Promise<number> {
	let postIds = Array(nPosts)
	for (let i = 0; i < nPosts; i++) {
		let postId = await createPost(tag, null, 'Post ' + i, '101')
		postIds[i] = postId
	}

	return postIds[0]
}

await simulateAttentionShare()
