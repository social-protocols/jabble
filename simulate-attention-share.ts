
import { db } from "#app/db.ts";
import { type Post, type PostStats } from "#app/db/types.ts";
// import bloomFilters from 'bloom-filters';

import { LocationType, logTagPageView } from "#app/attention.ts";

import assert from 'assert';

// import { sql } from 'kysely';

import { flushTagPageStats, seedStats, tagStats } from "#app/attention.ts";

import { createPost } from "#app/post.ts";

import { Direction, vote } from "#app/vote.ts";

import { type Tally } from '#app/beta-gamma-distribution.ts';

import { getRankedPosts, totalInformationGain, MAX_RESULTS } from '#app/ranking.ts';
import { getOrInsertTagId } from '#app/tag.ts';


import jStat from 'jstat';

// import { SingleBar, cliProgress } from 'cli-progress'
import * as cliProgress from 'cli-progress';



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
time step, we generate a page with randomly sorted, then calculate the "true" vote rate for
each post given the rank it is shown at and it's voteRate. Specifically:

	trueVoteRate = voteRate * attentionShare[location]

We then sample from a Poisson distribution with
that true vote rate and simulate that number of votes. We then call
logVoteOnRandomlyRankedPost() to log the votes. Over time, the logic
in logVoteOnRandomlyRankedPost should update the locationStats table so that
attentionShare approximates the true attentionShare at that location. 

We then compare the estimated attentionShare in the locationStats table with
the true attention share and calculate average square error. This should be
reasonably low -- e.g. under 0.1 is probably acceptable.

We also track the cumulative attention of each vote, where on each impression
the delta attention for a post is the total expected votes per impression
times the vote share for the location the post was shown at.

At the end of the simulation, we compare the estimated voteRate for each post,
calculated as votes / cumulativeAttention (possibly with a constant for
Bayesian averaging). We then calculate the total error between the estimated
vote factor and the known vote factors for each post.


logVoteOnRandomlyRankedPost uses an exponentially weighted moving average in
LocationStats. There is a tradeoff in the selection of this alpha. Too big ,
and the estimates for locations at large ranks(large value of oneBasedRank)
will be way off, because we get few votes at those locations, and so the
weighted average bounces around a lot. But too big (too large a moving
average window) and the estimates don't change with time as user voting
behavior changes. As of writing it seems at least .9999 (window of
approximately 1,000 to 10,000) is necessary to get small errors. Roughly it is saying we do
calculations over the last 10k sitewide votes.

m=1000, nRanks=90, votesPerPeriod=20, alpha=.99, MSE = 2.548275797826558
" alpha=.999, MSE=0.08746957597521526
" alpha=.9999, MSE= 0.008163008679462406



*/


const m = 200
const nPosts = 100
const nRanks = MAX_RESULTS
const nUsers = 1000
const votesPerPeriod = 20
const tag = "test"


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
	const rankExponent: number = .63
	return Math.pow(oneBasedRank, -rankExponent)
}

function voteShareAtRank(oneBasedRank: number): number {
	return rankFactor(oneBasedRank) / normalizationConstant
}


async function simulateAttentionShare() {
	console.log(`Simulating ${m} time periods, ${nUsers} users, {votesPerPeriod} votes/period, {nRanks} ranks, randomly selected posts`)

	await seedStats()

	assert(nPosts >= nRanks, "nPosts >= nRanks")
	assert(nUsers >= nPosts, "nUsers >= nPosts")

	const rankedPosts = Array.from(Array(nPosts).keys())
	const logVoteRates = rankedPosts.map(() => jStat.normal.sample(0, .3))
	const upvoteProbabilities = rankedPosts.map(() => Math.random())
	// const upvoteProbabilities = rankedPosts.map(() => jStat.uniform.sample(0, 1))

	console.log("Creating simulated posts")
	let postIds = Array(nPosts)
	for (let i = 0; i < nPosts; i++) {
		let postId = await createPost(tag, null, "Post " + i + " true voteRate=" + Math.exp(logVoteRates[i]) + ", true upvoteProbabilities=" + upvoteProbabilities[i], "101")
		postIds[i] = postId
	}

	let minPostId = postIds[0]


	let tagId = await getOrInsertTagId(tag)

	console.log("Creating simulated users")
	for (let i = 0; i < nUsers; i++) {
		let userId = i + 1000
		await db.insertInto("User")
			.values({
				id: userId.toString(),
				username: "user" + i,
				email: "user" + i + "@test.com",
				// password: "passw0rd"
				// password: "createPassword("user" + i)"
			}).execute()
	}

	console.log("Running simulation")

	const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
	bar1.start(m, 0);

	let totalVotes = 0

	// for each period
	for (let t = 0; t < m; t++) {

		// rank posts randomly
		// shuffleArray(rankedPosts)
		// let tagPage = rankedPosts.map(postNumber => postIds[postNumber]).slice(0, nRanks)

		let tagPage = (await getRankedPosts(tag)).map((p: Post) => p.id)

		// console.log("First post", rankedPosts[0])

		// cycle through users
		// let userId = (1000 + t % nUsers).toString()

		// assume all users views the tag page
		for (let i = 0; i < nUsers; i++) {
			let userId = (1000 + i).toString()
			logTagPageView(userId, tag)
		}

		// for each rank
		for (let i = 0; i < nRanks; i++) {

			let oneBasedRank = i + 1
			let postId = tagPage[i]!

			let postNumber = postId - minPostId

			// assert(postNumber != undefined, "postNumber is not undefined")
			// let postId = postIds[postNumber]

			// get the actual vote rate for this post at this rank 
			let voteRate = Math.exp(logVoteRates[postNumber])
			// let rf = rankFactor(oneBasedRank)
			let voteShare = voteShareAtRank(oneBasedRank)
			// console.log("Rf", oneBasedRank, rf, voteShare)
			let actualVoteRate = votesPerPeriod * voteShare * voteRate

			// get a random number of votes from a Poisson distribution with the actual vote rate
			let votes = jStat.poisson.sample(actualVoteRate)
			// console.log("Votes for rank", i, votes, actualVoteRate, voteShare, voteRate)

			let upvoteProbability = upvoteProbabilities[postNumber]
			// let direction = Math.random() < upvoteProbability ? Direction.Up : Direction.Down
			let direction = Direction.Up 

			// Log the votes
			for (let j = 0; j < votes; j++) {
				let location = { locationType: locationType, oneBasedRank: oneBasedRank }

				// cycle through the users when choosing a user to vote...
				let userId = (1000 + t % nUsers).toString()

				await vote(tag, userId, postId, null, direction, location)
				totalVotes++
			}
		}
		bar1.update(t);

		// update stats in the DB. logTagPageView just increments counters in memory which
		// need to be update periodicially.
		// console.log("totalVotes", totalVotes)
		await flushTagPageStats(tag, tagPage)	


	}
	bar1.stop()

	console.log("Total votes", totalVotes, "expected approximately", m * votesPerPeriod)

	let voteShares = await db.selectFrom("LocationStats").selectAll().orderBy("oneBasedRank").execute()

	assert(voteShares.length == nRanks, "voteShares.length == nRanks")

	let squareErrorLocations = 0
	for (let i = 0; i < nRanks; i++) {
		// let l = rankFactor(i + 1)
		let actualShare = voteShareAtRank(i + 1)
		// total = total + l
		let estimatedShare = voteShares[i]!.voteShare
		let error = (actualShare - estimatedShare) / actualShare
		// console.log("Location share at rank ", i + 1, "actual", actualShare, "estimated", estimatedShare, "error", error)
		squareErrorLocations += error * error
	}



	let postStats = await db.selectFrom("PostStats")
		// where postId > minPostId
		.where("postId", ">=", postIds[0])
		.where("tagId", "=", tagId)
		.selectAll().orderBy("postId").execute()

	let postTally = await db.selectFrom("CurrentTally")
		.where("postId", ">=", postIds[0])
		.where("tagId", "=", tagId)
		.selectAll().orderBy("postId").execute()


	let squareErrorPosts = 0
	for (let i = 0; i < nPosts; i++) {

		let postId = postIds[i]

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

		let estimatedVoteRate = t / a

		let error = (actualVoteRate - estimatedVoteRate) / actualVoteRate
		console.log("Vote rate for post ", i, "actual", actualVoteRate, "estimated", estimatedVoteRate, "t", t, "a", a, "error", error * error)
		squareErrorPosts += error * error
	}

	console.log("Mean Square error for attentionShare at each rank", squareErrorLocations / nRanks)
	console.log("Mean Square error for vote rate", squareErrorPosts / nPosts)

	let totalGain = await totalInformationGain(tagId)
	let totalViews = (await tagStats(tag)).views
	console.log("Information gain per view", totalGain/totalViews)

}


function shuffleArray<T>(array: T[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j]!, array[i]!];
	}
}

await simulateAttentionShare()




