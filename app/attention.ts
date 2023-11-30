
import { db } from "#app/db.ts";
import { type Post, type PostStats } from "#app/db/types.ts";

import { getOrInsertTagId } from './tag.ts';

import assert from 'assert';

export enum LocationType {
	NewPost = 0,
	TagPage = 1,
	UserFeed = 2,
}

export type Location = {
	locationType: LocationType,
	oneBasedRank: number,
}

export async function cumulativeAttention(tagId: number, postId: number): Promise<number> {
	// the following code but kysely version
	const stats: PostStats | undefined = await db
		.selectFrom('PostStats')
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.selectAll()
		.executeTakeFirst();

	if (stats == undefined) {
		return 0
	}

	return stats.attention
}



export async function logTagPageView(userId: string, tag: string, posts: number[]) {

	// todo transaction

	let tagId = await getOrInsertTagId(tag)

	for(let i = 0; i < posts.length; i++) {
		let id = posts[i]
		await logPostView(userId, tagId, id, { locationType: LocationType.TagPage, oneBasedRank: i + 1 })
	}
}


export async function logAuthorView(userId: string, tagId: number, postId: number) {
	await logPostView(userId, tagId, postId, { locationType: LocationType.NewPost, oneBasedRank: 1 })	
}

async function logPostView(userId: string, tagId: number, postId: number, location: Location) {

	let results = await db.selectFrom('PostStats')
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.selectAll()
		.execute()

	if(results.length == 0) {
		let query = db
			.insertInto('PostStats')
			.values({
				tagId: tagId,
				postId: postId,
				// initial attention is 1, because each post automatically gets 1 upvote from the author
				// and so the expectedVotes (attention) for a new post is equal to 1.
				attention: 1,
				views: 1,
			})

		let result = await query.execute()
		// console.log("REsult of initial insert", tagId, postId, result)

		return;
	} 

	let stats = results[0]
	// console.log("Stats after insert with conflict", postId, stats)

	if(stats == undefined) {
		// console.log("Compiled poststats query", r, query.compile(), filterJSON, postId)
		console.log("Undefined stats.", tagId, postId, stats)
	}
	assert(stats !== undefined)	

	await db
		.updateTable('PostStats')
		.from(
			'LocationStats',
		)
		.set(({ eb, ref }) => ({
			attention: eb('attention', '+', ref('voteShare')),
			views: eb('views', '+', 1),
		}))
		.where('LocationStats.locationType', '=', location.locationType)
		.where('LocationStats.oneBasedRank', '=', location.oneBasedRank)
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.execute();

	return; 

}



// Seed locationStats with a good guess about the relative number of votes at each location
export async function seedStats() {


	await db.deleteFrom('SiteStats').execute()
	await db.deleteFrom('LocationStats').execute()

	const startingSitewideVotes = 1000 
	// const startingSitewideViews = 1000
	db.insertInto('SiteStats').values({ votes: startingSitewideVotes }).onConflict(oc => oc.doNothing()).execute()

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




