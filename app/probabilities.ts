import { prisma } from '#app/utils/db.server.ts';
import { Result } from "@badrap/result";
// import { Prisma } from '@prisma/client';

import { type CurrentInformedTally, type CurrentTally, type Post, type Tag } from '@prisma/client';

import assert from 'assert';


function from_alpha_beta(alpha: number, beta: number): BetaDistribution {
    return new BetaDistribution(
        alpha / (alpha + beta),
        alpha + beta,
    )
}


class BetaDistribution {
    constructor(public average: number = 0, public weight: number = 0) {}

    update(tally: Tally): BetaDistribution {
        return new BetaDistribution(
            bayesian_average(this.average, this.weight, tally),
            this.weight + tally.total,        
        )
    }
} 

function bayesian_average(prior_average: number, weight: number, tally: Tally): number {
    return (prior_average * weight + tally.upvotes) / (weight + tally.total)
}

const WEIGHT_CONSTANT: number = 2.3

const GLOBAL_PRIOR = new BetaDistribution(0.875, WEIGHT_CONSTANT)


export type Tally = {
    readonly upvotes: number,
    readonly total: number,
}

const EMPTY_TALLY = {
    upvotes: 0,
    total: 0,
}

type InformedTally = {
    postId: number,
    noteId: number,

    givenNotShownThisNote: Tally,
    givenShownThisNote: Tally,
    forNote: Tally,
}


function to_informed_tally(result: CurrentInformedTally, forNote: Tally): InformedTally {
    return {
        postId: result.postId,
        noteId: result.noteId,
        givenNotShownThisNote: {
            upvotes: result.upvotesGivenNotShownThisNote,
            total: result.votesGivenNotShownThisNote,
        },
        givenShownThisNote: {
            upvotes: result.upvotesGivenShownThisNote,
            total: result.votesGivenShownThisNote,
        },
        forNote: {
            upvotes: forNote.upvotes,
            total: forNote.total,
        },
    }
}

export async function get_current_tallies(tagId: number, postId: number, map: Map<number, InformedTally[]>) {
    const results: CurrentInformedTally[] = await prisma.currentInformedTally.findMany({
        where: {
            tagId: tagId,
            postId: postId,
        },
    })

    let tallies = await Promise.all(results.map(async result => {
        await get_current_tallies(tagId, result.noteId, map)
        let for_note = (await current_tally(tagId, result.noteId))

        return to_informed_tally(result, for_note)
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
    //       FROM current_informed_tally p
    //       WHERE postId = ${postId}
    //         UNION ALL
    //       SELECT 
    //           p.postId
    //         , p.noteId
    //         , p.votes_given_not_shown_this_note
    //         , p.upvotes_given_not_shown_this_note
    //         , p.votes_given_not_shown_this_note
    //         , p.upvotes_given_not_shown_this_note
    //       FROM children c
    //       INNER JOIN current_informed_tally p ON p.postId = c.noteId
    //     )
    //     SELECT 
    //         children.*
    //         , current_tally.votes as votes_for_note 
    //         , current_tally.upvotes as upvotes_for_note
    //     FROM children join current_tally on(current_tally.postId = children.noteId);

    return
}


export async function get_or_insert_tag_id(tag: string): Promise<number> {

    let t: Tag | null = await prisma.tag.findUnique({ where: { tag: tag } })

    if (t == null) {
        await prisma.tag.create({
            data: {
                tag: tag,
            },
        })
    }

    t = await prisma.tag.findUnique({ where: { tag: tag } })
    assert(t != null)
    return t.id
}

export async function find_top_note(tag: string, postId: number): Promise<[Post, number, number] | null> {

    let tagId = await get_or_insert_tag_id(tag)

    let tallies_map = new Map<number, InformedTally[]>()
    await get_current_tallies(tagId, postId, tallies_map)

    console.log("Current tallies", tallies_map)

    let tally = await current_tally(tagId, postId)

    const [noteId, p, q] = find_top_note_given_tallies(postId, tally, tallies_map);

    console.log("Top note", noteId, p, q)

    let note: Post = await prisma.post.findUniqueOrThrow({ where: { id: noteId } })

    return [note, p, q];
} 


async function current_tally(tagId: number, postId: number): Promise<Tally> {

    const tally: CurrentTally | null = await prisma.currentTally.findFirst({
        where: {
            tagId: tagId,
            postId: postId,
        },
    })

    if (tally == null) {
        return EMPTY_TALLY
    }

    return tally;
}


// In the context of this function, we always have two posts in scope: A post along with a
// note that is attached to it. Here, we call those "A" and "B" (or "a" and "b" in variable
// and function names).
// The function recurses through the tree of a conversation started by the post `postId`,
// always looking at post/note combinations.
export function find_top_note_given_tallies(
    postId: number,
    postTally: Tally,
    subnoteTallies: Map<number, InformedTally[]>,
): [number, number, number] {
    let pOfAGivenNotShownTopNote = GLOBAL_PRIOR.update(postTally).average;

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
            find_top_note_given_tallies(tally.noteId, tally.forNote, subnoteTallies);
        let support = p_of_b_given_shown_top_subnote / pOfBGivenNotShownTopSubnote;

        let pOfAGivenNotShownThisNote = GLOBAL_PRIOR
            .update(tally.givenNotShownThisNote)
            .average;
        let pOfAGivenShownThisNote = GLOBAL_PRIOR
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
