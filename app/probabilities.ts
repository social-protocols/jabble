// import assert from 'assert';

import { BetaDistribution, type Tally } from '#app/beta-gamma-distribution.ts'
import {
	type CurrentTally,
	type DetailedTally,
	type Post,
} from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
import { getOrInsertTagId } from './tag.ts'

// import { Selectable } from 'kysely';

//Import data structures

export const WEIGHT_CONSTANT = 2.3

// The global prior on the upvote probability (upvotes / votes)
export const GLOBAL_PRIOR_UPVOTE_PROBABILITY = new BetaDistribution(
	0.875,
	WEIGHT_CONSTANT,
)

// Global prior on the vote rate (votes / attention). By definition the prior average is 1,
// because attention is calculated as the expected votes for the average post.
export const GLOBAL_PRIOR_VOTE_RATE = new BetaDistribution(1, WEIGHT_CONSTANT)

const EMPTY_TALLY = {
	count: 0,
	total: 0,
}

type InformedTally = {
	postId: number
	noteId: number

	givenNotShownThisNote: Tally
	givenShownThisNote: Tally
	forNote: Tally
}

function toInformedTally(result: DetailedTally, forNote: Tally): InformedTally {
	return {
		postId: result.postId,
		noteId: result.noteId,
		givenNotShownThisNote: {
			count: result.countGivenNotShownThisNote,
			total: result.totalGivenNotShownThisNote,
		},
		givenShownThisNote: {
			count: result.countGivenShownThisNote,
			total: result.totalGivenShownThisNote,
		},
		forNote: {
			count: forNote.count,
			total: forNote.total,
		},
	}
}

export async function voteRate(tag: string, postId: number): Promise<number> {
	const tagId = await getOrInsertTagId(tag)

	const tally = await currentTally(tagId, postId)
	const attention = await cumulativeAttention(tagId, postId)

	console.log(`Cumulative attention for ${postId}, ${attention}`, tally)

	return GLOBAL_PRIOR_VOTE_RATE.update({ count: tally.total, total: attention })
		.mean
}

export async function informedProbability(
	tag: string,
	postId: number,
): Promise<number> {
	const tagId = await getOrInsertTagId(tag)

	const [_noteId, _p, q] = await findTopNoteId(tagId, postId)

	return q
}

export async function findTopNoteId(
	tagId: number,
	postId: number,
): Promise<[number | null, number, number]> {
	const talliesMap = new Map<number, InformedTally[]>()
	await getCurrentTallies(tagId, postId, talliesMap)

	const tally = await currentTally(tagId, postId)

	const result = findTopNoteGivenTallies(postId, tally, talliesMap)
	return result
}

// In the context of this function, we always have two posts in scope: A post along with a
// note that is attached to it. Here, we call those "A" and "B" (or "a" and "b" in variable
// and function names).
// The function recurses through the tree of a conversation started by the post `postId`,
// always looking at post/note combinations.
export function findTopNoteGivenTallies(
	postId: number,
	postTally: Tally,
	subnoteTallies: Map<number, InformedTally[]>,
): [number | null, number, number] {
	let pOfAGivenNotShownTopNote =
		GLOBAL_PRIOR_UPVOTE_PROBABILITY.update(postTally).mean

	let pOfAGivenShownTopNote = pOfAGivenNotShownTopNote

	let topNoteId: number | null = null

	const tallies = subnoteTallies.get(postId)

	if (tallies == null) {
		// console.log(
		// 	`top note for post ${postId} is note ${topNoteId} with p=${pOfAGivenShownTopNote} and q=${pOfAGivenNotShownTopNote}`,
		// )
		// Bit of a hack. Should just get overall tally
		return [topNoteId, pOfAGivenShownTopNote, pOfAGivenNotShownTopNote]
	}

	// loop over tallies
	for (const tally of tallies) {
		const [_, p_of_b_given_shown_top_subnote, pOfBGivenNotShownTopSubnote] =
			findTopNoteGivenTallies(tally.noteId, tally.forNote, subnoteTallies)
		const support = p_of_b_given_shown_top_subnote / pOfBGivenNotShownTopSubnote

		const pOfAGivenNotShownThisNote = GLOBAL_PRIOR_UPVOTE_PROBABILITY.update(
			tally.givenNotShownThisNote,
		).mean

		const pOfAGivenShownThisNote = GLOBAL_PRIOR_UPVOTE_PROBABILITY.update(
			tally.givenNotShownThisNote,
		)
			.resetWeight(WEIGHT_CONSTANT)
			.update(tally.givenShownThisNote).mean
		const delta = pOfAGivenShownThisNote - pOfAGivenNotShownThisNote

		const pOfAGivenShownThisNoteAndTopSubnote =
			pOfAGivenNotShownThisNote + delta * support

		// console.log(
		// 	`For post ${postId} and note ${tally.noteId}, pOfAGivenShownThisNote=${pOfAGivenShownThisNote}, pOfAGivenNotShownThisNote=${pOfAGivenNotShownThisNote}, delta=${delta}, support=${support}`,
		// )

		if (
			Math.abs(
				pOfAGivenShownThisNoteAndTopSubnote - pOfAGivenNotShownThisNote,
			) > Math.abs(pOfAGivenShownTopNote - pOfAGivenNotShownTopNote)
		) {
			pOfAGivenShownTopNote = pOfAGivenShownThisNoteAndTopSubnote
			pOfAGivenNotShownTopNote = pOfAGivenNotShownThisNote
			topNoteId = tally.noteId
		}
	}

	// console.log(
	// 	`\ttop note for post ${postId} is note ${topNoteId} with p=${pOfAGivenShownTopNote} and q=${pOfAGivenNotShownTopNote}`,
	// )

	return [topNoteId, pOfAGivenShownTopNote, pOfAGivenNotShownTopNote]
}

async function currentTally(tagId: number, postId: number): Promise<Tally> {
	const tally: CurrentTally[] = await db
		.selectFrom('CurrentTally')
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.selectAll()
		.execute()

	const t = tally[0]
	if (t === undefined) {
		return EMPTY_TALLY
	}

	return t
}

async function cumulativeAttention(
	tagId: number,
	postId: number,
): Promise<number> {
	const stats = await db
		.selectFrom('PostStats')
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.selectAll()
		.execute()

	const s = stats[0]
	if (s === undefined) {
		return 0
	}

	return s.attention
}

async function getCurrentTallies(
	tagId: number,
	postId: number,
	map: Map<number, InformedTally[]>,
) {
	const results = await db
		.selectFrom('DetailedTally')
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.selectAll()
		.execute()

	const tallies = await Promise.all(
		results.map(async result => {
			await getCurrentTallies(tagId, result.noteId, map)
			const tallyForNote = await currentTally(tagId, result.noteId)

			return toInformedTally(result, tallyForNote)
		}),
	)

	if (tallies.length > 0) {
		map.set(postId, tallies)
	}

	// This recursive function code is an alternative to the above recursive query.
	// The Typescript code is both simpler than the SQL and avoids using executeRaw statements
	// Which can not guarantee type safety.
	//     WITH children AS
	//     (
	//         SELECT
	//           postId
	//         , noteId
	//         , votes_given_shown_this_note
	//         , upvotes_given_shown_this_note
	//         , votes_given_not_shown_this_note
	//         , upvotes_given_not_shown_this_note
	//       FROM DetailedTally p
	//       WHERE postId = ${postId}
	//         UNION ALL
	//       SELECT
	//           p.postId
	//         , p.noteId
	//         , p.countGivenNotShownThisNote
	//         , p.countGivenNotShownThisNote
	//       FROM children c
	//       INNER JOIN DetailedTally p ON p.postId = c.noteId
	//     )
	//     SELECT
	//         children.*
	//         , currentTally    //         , currentTally.count as tallyForNote
	//     FROM children join currentTally on(currentTally.postId = children.noteId);

	return
}
