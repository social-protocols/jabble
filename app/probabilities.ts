// import assert from 'assert';

import { BetaDistribution, type Tally } from '#app/beta-distribution.ts';
import { type CurrentInformedTally, type CurrentTally, type Post } from '#app/db/types.ts'; // this is the Database interface we defined earlier
import { db } from "#app/db.ts";
import { getOrInsertTagId } from './tag.ts';

// import { Selectable } from 'kysely';


//Import data structures

export const WEIGHT_CONSTANT: number = 2.3

export const GLOBAL_PRIOR_PROBABILITY = new BetaDistribution(0.875, WEIGHT_CONSTANT)
export const GLOBAL_PRIOR_VOTE_RATE = new BetaDistribution(1, WEIGHT_CONSTANT)


const EMPTY_TALLY = {
    count: 0,
    total: 0,
}

type InformedTally = {
    postId: number,
    noteId: number,

    givenNotShownThisNote: Tally,
    givenShownThisNote: Tally,
    forNote: Tally,
}

function toInformedTally(result: CurrentInformedTally, forNote: Tally): InformedTally {
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

    let tagId = await getOrInsertTagId(tag)

    let tally = await currentTally(tagId, postId)
    let attention = await cumulativeAttention(tagId, postId)

    console.log(`Cumulative attention for ${postId}, ${attention}`, tally)

    return GLOBAL_PRIOR_VOTE_RATE.update({ count: tally.total, total: attention }).average

}


export async function informedProbability(tag: string, postId: number): Promise<number> {

    let tagId = await getOrInsertTagId(tag)

    const [_noteId, _p, q] = await findTopNoteId(tagId, postId);

    return q
}


export async function topNote(tag: string, postId: number): Promise<Post | null> {

    let tagId = await getOrInsertTagId(tag)

    const [noteId, _p, _q] = await findTopNoteId(tagId, postId);

    if (noteId == 0) {
        return null
    }

    const tallies = await db.selectFrom("Post").where("id", "=", noteId).selectAll().execute()

    return tallies[0]
}


export async function findTopNoteId(tagId: number, postId: number): Promise<[number, number, number]> {

    let talliesMap = new Map<number, InformedTally[]>()
    await getCurrentTallies(tagId, postId, talliesMap)

    console.log("Current tallies", talliesMap)

    let tally = await currentTally(tagId, postId)

    let result = findTopNoteGivenTallies(postId, tally, talliesMap);
    if (result == null) {
        return [0, 0, 0]
    }
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
): [number, number, number] {
    let pOfAGivenNotShownTopNote = GLOBAL_PRIOR_PROBABILITY.update(postTally).average;

    let pOfAGivenShownTopNote = pOfAGivenNotShownTopNote;

    let topNoteId: number = 0;

    let tallies = subnoteTallies.get(postId);

    if (tallies == null) {
        console.log(
            `top note for post ${postId} is note ${topNoteId} with p=${pOfAGivenShownTopNote} and q=${pOfAGivenNotShownTopNote}`,
        );
        // Bit of a hack. Should just get overall tally
        return [
            topNoteId,
            pOfAGivenShownTopNote,
            pOfAGivenNotShownTopNote,
        ];
    }

    // loop over tallies
    for (let tally of tallies) {

        let [_, p_of_b_given_shown_top_subnote, pOfBGivenNotShownTopSubnote] =
            findTopNoteGivenTallies(tally.noteId, tally.forNote, subnoteTallies);
        let support = p_of_b_given_shown_top_subnote / pOfBGivenNotShownTopSubnote;

        let pOfAGivenNotShownThisNote = GLOBAL_PRIOR_PROBABILITY
            .update(tally.givenNotShownThisNote)
            .average;
        let pOfAGivenShownThisNote = GLOBAL_PRIOR_PROBABILITY
            .update(tally.givenNotShownThisNote)
            .update(tally.givenShownThisNote)
            .average;
        let delta = pOfAGivenShownThisNote - pOfAGivenNotShownThisNote;

        let pOfAGivenShownThisNoteAndTopSubnote =
            pOfAGivenNotShownThisNote + delta * support;

        console.log(`\tFor post ${postId} and note ${tally.noteId}, pOfAGivenShownThisNote=${pOfAGivenShownThisNote}, pOfAGivenNotShownThisNote=${pOfAGivenNotShownThisNote}, delta=${delta}, support=${support}`);

        if (Math.abs(pOfAGivenShownThisNoteAndTopSubnote - pOfAGivenNotShownThisNote)
            > Math.abs(pOfAGivenShownTopNote - pOfAGivenNotShownTopNote)) {
            pOfAGivenShownTopNote = pOfAGivenShownThisNoteAndTopSubnote;
            pOfAGivenNotShownTopNote = pOfAGivenNotShownThisNote;
            topNoteId = tally.noteId;
        }
    }

    console.log(`top note for post ${postId} is note ${topNoteId} with p=${pOfAGivenShownTopNote} and q=${pOfAGivenNotShownTopNote}`);

    return [
        topNoteId,
        pOfAGivenShownTopNote,
        pOfAGivenNotShownTopNote,
    ]
}

async function currentTally(tagId: number, postId: number): Promise<Tally> {

    const tally: CurrentTally[] = await db
        .selectFrom("CurrentTally")
        .where("tagId", "=", tagId)
        .where("postId", "=", postId)
        .selectAll()
        .execute()

    if (tally.length == 0) {
        return EMPTY_TALLY
    }

    return tally[0];
}


async function cumulativeAttention(tagId: number, postId: number): Promise<number> {

    const stats = await db.selectFrom("PostStats").where("tagId", "=", tagId).where("postId", "=", postId).selectAll().execute()

    if (stats.length == 0) {
        return 0
    }

    return stats[0].attention
}



async function getCurrentTallies(tagId: number, postId: number, map: Map<number, InformedTally[]>) {
    // use dribble to select current informed tally
    const results = await db.selectFrom("CurrentInformedTally").where("tagId", "=", tagId).where("postId", "=", postId).selectAll().execute()

    // console.log("Got tallies", results)

    let tallies = await Promise.all(results.map(async result => {
        await getCurrentTallies(tagId, result.noteId, map)
        let for_note = (await currentTally(tagId, result.noteId))

        return toInformedTally(result, for_note)
    }))

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
    //       FROM currentInformedTally p
    //       WHERE postId = ${postId}
    //         UNION ALL
    //       SELECT 
    //           p.postId
    //         , p.noteId
    //         , p.countGivenNotShownThisNote
    //         , p.countGivenNotShownThisNote
    //       FROM children c
    //       INNER JOIN currentInformedTally p ON p.postId = c.noteId
    //     )
    //     SELECT 
    //         children.*
    //         , currentTally    //         , currentTally.count as upvotes_for_note
    //     FROM children join currentTally on(currentTally.postId = children.noteId);

    return
}


