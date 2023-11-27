
import { db } from "#app/db.ts";
import { type CumulativeStats, type Post } from "#app/db/types.ts";
import bloomFilters from 'bloom-filters';

import { getOrInsertTagId } from './tag.ts';

import assert from 'assert';

export enum PageType {
	// POST_PAGE,
	// TOP_NOTE_ON_POST_PAGE,
	Tag,
	Feed,
	NewPost,
}

export type Location = {
	pageType: PageType,
	oneBasedRank: number,
}


export async function cumulativeAttention(tagId: number, postId: number): Promise<number> {
	// the following code but kysely version
	const stats: CumulativeStats | undefined = await db
		.selectFrom('CumulativeStats')
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.selectAll()
		.executeTakeFirst();

	if (stats == undefined) {
		return 0
	}

	return stats.attention
}

export async function logTagPageView(userId: string, tag: string, posts: Post[]) {

	let tagId = await getOrInsertTagId(tag)

	posts.map((post, i) => {
		logImpression(userId, tagId, post.id, {pageType: PageType.Tag, oneBasedRank: i + 1})
	})

}

// Guesses for now
const pageTypeCoefficients: Map<PageType, number> = new Map([
	[PageType.Tag, 0.1],
	[PageType.Feed, 0.1],
	[PageType.NewPost, 1],
])

async function logImpression(userId: string, tagId: number, postId: number, location: Location) {
	let pageTypeC = pageTypeCoefficients.get(location.pageType);
	assert(pageTypeC !== undefined)
	accumulateAttention(userId, tagId, postId, pageTypeC / location.oneBasedRank)
}


export async function logAuthorImpression(userId: string, tagId: number, postId: number) {
	let pageTypeC = pageTypeCoefficients.get(PageType.NewPost);
	assert(pageTypeC !== undefined)
	accumulateAttention(userId, tagId, postId, pageTypeC)	
}

async function accumulateAttention(userId: string, tagId: number, postId: number, deltaAttention: number) {

	const hashcount = 4
	const size = 75 

	console.log("User id in logImpression", userId)


	const stats: CumulativeStats | undefined = await db
		.selectFrom('CumulativeStats')
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.selectAll()
		.executeTakeFirst();


	if (stats != null) {
		
		// console.log("UNique users", stats.uniqueUsers)
		let j: JSON = JSON.parse(stats.uniqueUsers) as JSON
		// console.log("Parsed json", j)
		let filter = bloomFilters.BloomFilter.fromJSON(j)
	
		// console.log("Existing Filter is", filter.saveAsJSON())

		let key = userId.toString()

		if (!filter.has(key)) {
			// console.log("Doesn't have key", key)

			filter.add(key)
			let filterJSON: string = JSON.stringify(filter.saveAsJSON())
			// console.log("New filter -- updating", filterJSON)

			const result = await db
				.updateTable('CumulativeStats')
				.set((eb) => ({
					attention: eb('attention', '+', deltaAttention),
					uniqueUsers: filterJSON
				}))
				.where('tagId', '=', tagId)
				.where('postId', '=', postId)
				.execute();
			console.log("Result of update is", result)

		} else {
			console.log("Has key", key)

		}


	} else {
		// console.log("No stats")
		let filter = new bloomFilters.BloomFilter(size, hashcount)
		filter.add(userId.toString())
		let filterJSON: string = JSON.stringify(filter.saveAsJSON())
		// console.log("New Filter is", filterJSON)

		let result = await db
			.insertInto('CumulativeStats')
			.values({
				tagId: tagId,
				postId: postId,
				attention: deltaAttention,
				uniqueUsers: filterJSON
			})
			.execute();
		console.log("Result of create is", result)
	}

	// if (!filter.has(userId)) {
	// 	console.log("Missed userId in bloom filter", userID)

	// 	filter.add(userId)

	// 	let filterJSON = filter.saveAsJSON()

	// 	// console.log("Logging impression", tag, postId, location, rank)
	// 	let result = await prisma.cumulativeStats.upsert({
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
	// 				increment: deltaAttention,
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

	// let result = await prisma.cumulativeStats.update({
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

// export async function informationRate(tag: string, postId: number): Promise<number> {

// 	return 0
// }