
import { db } from "#app/db.ts";
import { CumulativeStats } from "#app/db/types.ts";

import assert from 'assert';

import { getOrInsertTagId } from './tag.ts';


export enum Location {
	POST_PAGE,
	TOP_NOTE_ON_POST_PAGE,
	TAG_PAGE,
}

import bloomFilters from 'bloom-filters';

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

export async function logImpression(userId: number, tag: string, postId: number, location: Location, rank: number) {

	userId = 100
	const hashcount = 4
	const size = 75 

	console.log("User id in logImpression", userId)

	let tagId = await getOrInsertTagId(tag)

	const stats: CumulativeStats | undefined = await db
		.selectFrom('CumulativeStats')
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.selectAll()
		.executeTakeFirst();

	let deltaAttention = 1

	if (stats != null) {
		console.log("Have stats", stats)

		// let filter = new bloomFilters.BloomFilter(size, hashcount)

		// filter.seed = stats.uniqueUsers

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
					attention: eb.bxp('attention', '+', deltaAttention),
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
		// console.log("Result of create is", result)
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

export async function informationRate(tag: string, postId: number): Promise<number> {

	return 0
}