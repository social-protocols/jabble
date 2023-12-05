
import { db } from "#app/db.ts";
import { type TagStats } from "#app/db/types.ts";

import { getOrInsertTagId } from './tag.ts';

import { GammaDistribution } from './beta-gamma-distribution.ts';


import { sql } from 'kysely';

// Global prior votes/view. The TagStats table keeps track of votes/view per tag, but
// we need to start with some prior. This value is currently just a wild guess.
const GLOBAL_PRIOR_VOTES_PER_VIEW = new GammaDistribution(.1, 4)


export enum LocationType {
	NewPost = 0,
	TagPage = 1,
	UserFeed = 2,
}

export type Location = {
	locationType: LocationType,
	oneBasedRank: number,
}


type TagStatsAccumulator = { filter: Map<String, boolean>, views: number, votes: number }

let statsForTag = new Map<string, TagStatsAccumulator>()


function getOrCreateStatsForTag(tag: string): TagStatsAccumulator {

	let stats = statsForTag.get(tag)

	if (stats == undefined) {
		// console.log("Not stats for tag", tag)
		// let filter = new bloomFilters.BloomFilter(bits, hashes)
		let filter = new Map<string, boolean>()
		stats = { filter: filter, views: 0, votes: 0 }
		statsForTag.set(tag, stats)
	}
	return stats
}

export function logTagVote(tag: string) {
	let stats = getOrCreateStatsForTag(tag)

	// console.log("Logging tag vote", tag)
	stats.votes += 1
}

export function logTagPageView(userId: string, tag: string) {

	let stats = getOrCreateStatsForTag(tag)
	let filter = stats.filter
	let key = userId;

	if (!filter.has(key)) {
		filter.set(key, true)
		stats.views += 1
	}
}

export async function saveTagPageStats(tag: string, posts: number[]) {

	let tagId = await getOrInsertTagId(tag)

	let deltaViews = 0
	let deltaVotes = 0

	let stats = statsForTag.get(tag) 
	if (stats != undefined) {
		deltaViews = stats.views
		deltaVotes = stats.votes
	}

	// console.log("Saving post page stats", deltaViews, deltaVotes)

	// Read total votes. Currently, CurrentTally is a view that sums over entire voteHistory.
	// This is super inefficient, but simple for now.

	let votesPerView = 0
	// Update tag stats, including total votes, views, and a moving average votesPerView
	{

		let movingAverageAlpha = .9999
		let windowSize = 1 / (1 - movingAverageAlpha)

		// console.log("Tag page stats", deltaVotes, deltaViews)
		// let votesPerView = deltaViews == 0 ? 0 : deltaVotes / deltaViews

		const query = db
			.insertInto('TagStats')
			.values({ 
				tagId: tagId, 
				views: deltaViews,
				votesPerView: GLOBAL_PRIOR_VOTES_PER_VIEW.update({ count: deltaVotes, total: deltaViews }).average,
			})
			.onConflict((oc) => oc
				.column('tagId')
				.doUpdateSet({
					// votes: eb => eb('votes', '+', deltaVotes),
					views: eb => eb('views', '+', deltaViews),
					votesPerView: sql<number>`
						case 
						when views < ${windowSize} then 							
							(votesPerView*views + ${deltaVotes}) / (views + ${deltaViews})
						else 
							votesPerView * pow(${movingAverageAlpha}, ${deltaViews}) + ${deltaVotes}*(1 - ${movingAverageAlpha})
						end
					`
				})
			)
			.returningAll();

		const result = await query.execute()

		// console.log("REturned valuefrom udate tag stats", result)
		votesPerView = result[0]!.votesPerView
	}

	// instead of using actual deltaVotes, use votesPerView*deltaViews, which is equal to deltaVotes
	// on average, but will be "smoother".
	let deltaAttention = votesPerView * deltaViews

	// Update individual post stats
	for (let i = 0; i < posts.length; i++) {
		await savePostStats(
			tagId, 
			posts[i]!, 
			{ locationType: LocationType.TagPage, oneBasedRank: i + 1 },

			deltaAttention,
		)
	}

	statsForTag = new Map<string, TagStatsAccumulator>()
}


export async function logAuthorView(userId: string, tagId: number, postId: number) {
	await savePostStats(tagId, postId, { locationType: LocationType.NewPost, oneBasedRank: 1 }, 1)	
}

async function savePostStats(tagId: number, postId: number, location: Location, deltaAttention: number) {

	// if (results.length == 0) {
	let query = db
		.insertInto('PostStats')
		.values({
			tagId: tagId,
			postId: postId,
			// initial attention is 1 + deltaAttention, because each post automatically gets 1 upvote from the author
			// and so the expectedVotes (attention) for a new post is equal to 1.
			attention: 1,
			views: 1,
		})
		// ignore conflict
		.onConflict((oc) => oc.column('postId').doNothing())
	await query.execute()
	// console.log("REsult of initial insert", tagId, postId, result)

	await db
		.updateTable('PostStats')
		.from('LocationStats')
		// .from('TagStats')
		.set(({ eb, ref }) => ({
			attention: eb('attention', '+', eb(ref('voteShare'), '*', deltaAttention)),
			views: eb('views', '+', 1),
		}))
		.where('LocationStats.locationType', '=', location.locationType)
		.where('LocationStats.oneBasedRank', '=', location.oneBasedRank)
		// .where('TagStats.tagId', '=', tagId)
		.where('PostStats.tagId', '=', tagId)
		.where('PostStats.postId', '=', postId)
		.returningAll()
		.execute()

	// console.log("Result of update PostSatats", result)

	return; 

}


// Seed locationStats with a good guess about the relative number of votes at each location
export async function seedStats() {

	await db.deleteFrom('ExplorationStats').execute()
	await db.deleteFrom('LocationStats').execute()

	const startingSitewideVotes = 1000 
	// const startingSitewideViews = 1000
	db.insertInto('ExplorationStats').values({ votes: startingSitewideVotes }).onConflict(oc => oc.doNothing()).execute()

	// Rough guess of vote share at position 1 just for seeding.
	const rankOneVoteShare = .08
	let locationType = LocationType.TagPage

	// loop i from 1 to 90
	for (let i = 1; i <= 90; i++) {
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
			.execute();
	

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


