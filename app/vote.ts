
import { db } from "#app/db.ts";
import { type Post } from '#app/db/types.ts'; // this is the Database interface we defined earlier
import { sql } from "kysely";

import { getOrInsertTagId } from './tag.ts';

export enum Direction {
    Up = 1,
    Down = -1,
    Neutral = 0,
}


// TODO: if a new post is untagged, do we post in in #global?
export async function vote(
    tag: string,
    userId: string,
    postId: number,
    noteId: number | null,
    direction: Direction,
) {

    const tagId = await getOrInsertTagId(tag)

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
            , duplicates as (
                select
                      parameters.userId
                    , parameters.tagId
                    , parameters.postId
                    , parameters.direction == ifnull(currentVote.direction, 0) as duplicate
                from parameters
                left join currentVote using (userId, tagId, postId)
            )
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
            join duplicates
            where not duplicate
    `

    let result = await query.execute(db)
    // console.log("Vote result", result)

    // await db
    //     .insertInto('voteHistory')
    //     .values({ userId, tagId, postId, noteId, direction: direction_i32 })
    //     .execute();
}

