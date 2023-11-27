
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
    userId: string,
    tagId: number,
    postId: number,
    noteId: number | null,
    direction: Direction,
) {

    console.log("Direction", direction)

    let query =  sql`
        with parameters as (
                select
                    ${userId} as userId,
                    ${tagId} as tagId,
                    ${postId} as postId,
                    ${noteId} as noteId,
                    ${direction} as direction
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
                , direction
            )
            select
                  parameters.userId
                , parameters.tagId
                , parameters.postId
                , parameters.direction
            from parameters
            join duplicates
            where not duplicate
    `

    console.log("Query", postId, query.toString())

    let result = await query.execute(db)

    console.log("Vote result", result)

    // await db
    //     .insertInto('voteHistory')
    //     .values({ userId, tagId, postId, noteId, direction: direction_i32 })
    //     .execute();
}

