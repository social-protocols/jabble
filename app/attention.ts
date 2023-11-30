
import { db, sqliteInstance } from "#app/db.ts";
import { type Post, type PostStats } from "#app/db/types.ts";
import bloomFilters from 'bloom-filters';

import { getOrInsertTagId } from './tag.ts';

import assert from 'assert';

// import { sql } from 'kysely';


export enum LocationType {
	// POST_PAGE,
	// TOP_NOTE_ON_POST_PAGE,
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


// const preparedStatement = sqliteInstance.prepare('update SiteStats set votes = votes + 2')

export async function logTagPageView(userId: string, tag: string, posts: number[]) {

	// todo transaction

	let tagId = await getOrInsertTagId(tag)

	// posts.forEach(async (id, i) => {
	// // Promise.all(posts.map(async (id, i) => {
	// 	// console.log("LOggint post view", post)
	// 	assert(id != undefined)
	// 	await logPostView(userId, tagId, id, { locationType: LocationType.TagPage, oneBasedRank: i + 1 })
	// })


	for(let i = 0; i < posts.length; i++) {
		let id = posts[i]
		assert(id != undefined)
		// id = 34
		// console.log("Logging post virew for post", id)
		await logPostView(userId, tagId, id, { locationType: LocationType.TagPage, oneBasedRank: i + 1 })
	}

	// posts.forEach((id, i) => {


	// })


	// let views = await preparedStatement.run()
	// console.log("Views",views)

	// await db
	// 	.updateTable('SiteStats')
	// 	.set(eb => ({
	// 		votes: eb('view', '+', 1)
	// 	}))
	// 	.execute();
}


export async function logAuthorView(userId: string, tagId: number, postId: number) {
	await logPostView(userId, tagId, postId, { locationType: LocationType.NewPost, oneBasedRank: 1 })	
}

async function logPostView(userId: string, tagId: number, postId: number, location: Location) {

	const hashcount = 4
	const size = 75 

	// console.log("Logging post view", userId, tagId, postId)

	// console.log("User id in logPostView", userId)


	// const stats: PostStats | undefined = await db
	// 	.selectFrom('PostStats')
	// 	.where('tagId', '=', tagId)
	// 	.where('postId', '=', postId)
	// 	.selectAll()
	// 	.executeTakeFirst();



	let filter = new bloomFilters.BloomFilter(size, hashcount)

	let key = userId.toString()

	let r = Math.random()

	// if (stats == undefined) {
	// console.log("No stats")
	// filter = new bloomFilters.BloomFilter(size, hashcount)
	let filterJSON: string = JSON.stringify(filter.saveAsJSON())
	// filter.add(key)
	// console.log("New Filter is", filterJSON)

	// console.log("Post id is ", r, postId)
	// assert(postId != undefined)
	// let query = db
	// 	.insertInto('PostStats')
	// 	.values({
	// 		tagId: tagId,
	// 		postId: postId,
	// 		// initial attention is 1, because each post automatically gets 1 upvote from the author
	// 		// and so the expectedVotes (attention) for a new post is equal to 1.
	// 		attention: 1,
	// 		uniqueUsers: filterJSON
	// 	})
	// 	.onConflict(oc => oc.)
	// 	.returningAll()

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
				uniqueUsers: filterJSON
			})

		let result = await query.execute()
		// console.log("REsult of initial insert", tagId, postId, result)

		return;
	} 

	// let result = await query.execute();
	// console.log("Result is",postId, result)
	// } catch (e) {
	// 	console.log("Caught error", r, e)
	// 	return;
	// }


	let stats = results[0]
	// console.log("Stats after insert with conflict", postId, stats)

	if(stats == undefined) {
		// console.log("Compiled poststats query", r, query.compile(), filterJSON, postId)
		console.log("Undefined stats.", tagId, postId, stats)
	}
	assert(stats !== undefined)	

	let j: JSON = JSON.parse(stats.uniqueUsers) as JSON
	filter = bloomFilters.BloomFilter.fromJSON(j)

	// If we already have a stats record
	if (!filter.has(key)) {
		// console.log("Doesn't have key", key)

		// filter.add(key)
		let filterJSON: string = JSON.stringify(filter.saveAsJSON())
		// console.log("New filter -- updating", filterJSON)

		// console.log("Updating post stats", postId)

		const result = await db
			.updateTable('PostStats')
			.from(
				'LocationStats',
			)
			.set(({ eb, ref }) => ({
				attention: eb('attention', '+', ref('voteShare')),
				views: eb('views', '+', 1),
				uniqueUsers: filterJSON
			}))
			.where('LocationStats.locationType', '=', location.locationType)
			.where('LocationStats.oneBasedRank', '=', location.oneBasedRank)
			.where('tagId', '=', tagId)
			.where('postId', '=', postId)
			.execute();


		// console.log("Result of update is", postId, result)
	}


	// if (!filter.has(userId)) {
	// 	console.log("Missed userId in bloom filter", userID)

	// 	filter.add(userId)

	// 	let filterJSON = filter.saveAsJSON()

	// 	// console.log("Logging impression", tag, postId, location, rank)
	// 	let result = await prisma.PostStats.upsert({
	// 		where: {
	// 			tagId: tagId,
	// 			postId: postId,
	// 			// noteId: noteId,
	// 		},
	// 		create: {
	// 			tagId: tagId, postId: postId, attention: 0, uniqueUsers: filterJSON,
	// 		},
	// 		update: {
	// 			attention: {
	// 				increment: voteShare,
	// 			},
	// 			uniqueUsers: {
	// 				// set value of uniqueUsers to be the JSON of the bloom filter
	// 				set: filterJSON,
	// 			}
	// 		}
	// 	})
	// 	console.log("UPsert result", result)
	// } else {
	// 	filter.add(userId)
	// }

	// let result = await prisma.PostStats.update({
	// 	where: { tagId: tagId, postId: postId },
	// 	update: {
	// 		uniqueUsers: {
	// 			// set value of uniqueUsers to be the JSON of the bloom filter
	// 			set: filter.saveAsJSON(),
	// 		}
	// 	}
	// })

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
			// .onConflict(oc => oc
			// 	.column('locationType') // assuming 'locationType' and 'rank' are your unique columns
			// 	.column('oneBasedRank')
			// 	.doUpdateSet({
			// 		voteShare: sql<number>`excluded.voteShare + 1`  // increment votes by 1
			// 	})
			// )
			.execute();
	

		// set sitewideUpvotes
	}

	// console.log("Set sitewide votes", sitewideVotes)
	// await db.updateTable('LocationStats').set(eb => ({
	// 	latestSitewideVotes: sitewideVotes
	// })).execute();


}




