import { prisma } from '#app/utils/db.server.ts';

import { type Tag } from '@prisma/client';

import assert from 'assert';

import { getOrInsertTagId } from './tag.ts';


export enum Location {
	POST_PAGE,
	TOP_NOTE_ON_POST_PAGE,
	TAG_PAGE,
}


export async function logImpression(tag: string, postId: number, location: Location, rank: Number) {

	let deltaAttention = 1

	let tagId = await getOrInsertTagId(tag)

	console.log("Logging impression", tag, postId, location, rank)
	let result = await prisma.cumulativeStats.upsert({
		where: {
			tagId: tagId,
			postId: postId,
			// noteId: noteId,
		},
		create: {
			tagId: tagId, postId: postId, attention: 0 
		},
		update: {
			// data: {
			attention: {
				increment: deltaAttention,
			},
			// },
		}
	})

	console.log("Result", result)

	return; 

}