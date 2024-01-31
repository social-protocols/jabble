import assert from 'assert'
import { sql } from 'kysely'
import { db } from '#app/db.ts'

import {
	type Location,
	logTagVote,
	logVoteOnRandomlyRankedPost,
} from './attention.ts'
import { getOrInsertTagId } from './tag.ts'
export enum Direction {
	Up = 1,
	Down = -1,
	Neutral = 0,
}

// TODO: if a new post is untagged, do we post in in #global?

// The vote function inserts a vote record in voteHistory, and also updates attention stats
export async function vote(
	tag: string,
	userId: string,
	postId: number,
	noteId: number | null,
	direction: Direction,
	randomLocation: Location | null,
) {
	const tagId = await getOrInsertTagId(tag)

	let added = await insertVoteRecord(tagId, userId, postId, noteId, direction)

	// Todo: dedupe in case user toggles vote multiple times
	if (added) {
		if (randomLocation != null) {
			await logTagVote(tag)
			await logVoteOnRandomlyRankedPost(randomLocation)
		}
	}
}

export async function insertVoteRecord(
	tagId: number,
	userId: string,
	postId: number,
	noteId: number | null,
	direction: Direction,
): Promise<boolean> {
	// TODO: transaction
	const direction_int = direction as number

	let query = sql`
        with parameters as (
                select
                    ${userId} as userId,
                    ${tagId} as tagId,
                    ${postId} as postId,
                    ${noteId} as noteId,
                    ${direction_int} as direction
            )
--            , duplicates as (
--                select
--                      parameters.userId
--                    , parameters.tagId
--                    , parameters.postId
--                    , parameters.direction == ifnull(currentVote.direction, 0) as duplicate
--                from parameters
--                left join currentVote using (userId, tagId, postId)
--            )
            insert into voteHistory (
                 userId 
                , tagId
                , postId
                , noteId
                , direction
            )
            select
                  parameters.userId
                , parameters.tagId
                , parameters.postId
                , parameters.noteId
                , parameters.direction
            from parameters
--            join duplicates
--            where not duplicate
    `

	let result = await query.execute(db)

	assert(result !== undefined)
	assert(result.numUpdatedOrDeletedRows !== undefined)
	return result.numUpdatedOrDeletedRows > 0
}
