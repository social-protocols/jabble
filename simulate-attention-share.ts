
import { db } from "#app/db.ts";
import { type Post, type PostStats } from "#app/db/types.ts";
import bloomFilters from 'bloom-filters';

import { LocationType, type Location, logTagPageView } from "#app/attention.ts";

import { logExplorationVote } from '#app/exploration.ts';

import assert from 'assert';

import { sql } from 'kysely';

import { seedStats } from "#app/attention.ts";

import jStat from 'jstat';



// import { logExplorationVote } from './attention.ts'


/*
This script was used to test and validate the logic for calculating attention
share by location.

In this script, we know the "true" attention share (expected votes) at each
location. We simulate a world where we have n posts, with logVoteRate that is
normally distributed. At each time step, we randomly order the posts. We then
calculate the expected vote rate for each post given its location and
logVoteRate. We then sample from the poisson distribution with that expected
vote rate to get the number of votes. We then call logExplorationVote() to
log the vote at that rank just as we would in production. Over time, the
logic in logExplorationVote should update the locationStats table so that
attentionShare approximates the true attentionShare at that location. Finally
we compare the estimated attentionShare in the locationStats table with the
true attention share and calculate average square error. This should be
reasonably low -- e.g. under 0.1 is probably acceptable.

There is a tradeoff on the alpha used in the exponential moving average
calculation in logExplorationVote. Too big (e.g. to small a moving average
window), and the estimates for locations at high ranks (high oneBasedRank)
will be way off, because we get few votes at those locations, and so the
weighted average bounces around a lot. But too big (too large a moving
average window) and the estimates don't change with time as user voting
behavior changes. As of writing this I figure .9999 (window of approximately
10000) makes sense. Basically it is saying we do calculations over the last
10k sitewide votes. With that this simulation gives me a MSE of 0.0325 with
m=200, n=200. Using just an overall average not a moving average, the MSE
is .004.

*/

const oneBasedRankFactor = .63
// const actualLocationTypeFactor = .1
const votesPerImpression = 200

function rankFactor(oneBasedRank: number): number {
	return Math.pow(oneBasedRank, -oneBasedRankFactor)
}

const m = 100
const n = 200;
const nRanks = 90
let normalizationConstant = 0
const locationType = LocationType.TagPage

// Get a normalization constant that converts the rank factor to a share of votes at each rank
for (let i = 0; i < nRanks; i++) {
	// let location = { locationType: locationType, oneBasedRank: i + 1 }
	let oneBasedRank = i + 1
	let l = rankFactor(oneBasedRank)
	normalizationConstant = normalizationConstant + l
}


await simulateAttentionShare()

async function simulateAttentionShare() {
	await seedStats()

	assert(n >= nRanks)

	const posts = Array.from(Array(n).keys())
	const logVoteRates = posts.map(post => jStat.normal.sample(0, .3))

	// for each minute
	for (let t = 0; t < m; t++) {

		console.log("T = ", t)
		// shuffle ranks
		shuffleArray(posts)

		// for each rank
		for (let i = 0; i < nRanks; i++) {

			let postNumber = posts[i]
			let oneBasedRank = i + 1

			// get the actual vote rate for this post at this location
			let postFactor = Math.exp(logVoteRates[postNumber])
			let rf = rankFactor(oneBasedRank)
			let voteShare = rf/normalizationConstant
			// console.log("Rf", oneBasedRank, rf, voteShare)
			let actualVoteRate = votesPerImpression * voteShare * postFactor

			assert(postNumber != undefined)

			// call this function just to update the sitewide view stats
			// but we don't need to accumulate attention for posts for this simulation
			await logTagPageView("foo", "global", [])

			// get a random number of votes from a poisson distribution with the actual vote rate
			let votes = jStat.poisson.sample(voteShare * votesPerImpression)

			// if(oneBasedRank == 1) {
			// 	console.log("Vote rate", oneBasedRank, postNumber, postFactor, voteShare, normalizationConstant, actualVoteRate)
			// 	console.log("Logging votes", oneBasedRank, votes, actualVoteRate)
			// }
			for (let j = 0; j < votes; j++) {
				let location = { locationType: locationType, oneBasedRank: oneBasedRank }
				await logExplorationVote(location)	
			}

			// log the votes
			// console.log("Votes is ", t, i,  postNumber, votes)
		}
	}



	let voteShares = await db.selectFrom("LocationStats").selectAll().orderBy("oneBasedRank").execute()

	assert(voteShares.length == nRanks)

	let squareError = 0
	for (let i = 0; i < nRanks; i++) {
		let l = rankFactor(i + 1)
		let actualShare = l / normalizationConstant
		// total = total + l
		let estimatedShare = voteShares[i].voteShare
		let error = (actualShare - estimatedShare) / actualShare
		console.log("Actual location share at rank ", i, actualShare, estimatedShare, error * error)
		squareError += error * error
	}
	console.log("Mean Square error", squareError / nRanks)

}

function shuffleArray<T>(array: T[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}




