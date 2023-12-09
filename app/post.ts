
import { db } from "#app/db.ts";
import { type Post } from '#app/db/types.ts'; // this is the Database interface we defined earlier

import { Direction, insertVoteRecord } from "#app/vote.ts";

import { getOrInsertTagId } from './tag.ts';

import assert from 'assert';

import { logAuthorView } from './attention.ts';

import { clearRankingsCacheForTagPage } from './ranking.ts';

// export type PostId = number & {readonly isPostId: unique symbol}

// import { LocationType } from './attention.ts';

// express the above fn in typescript with kysely queries
export async function createPost(
    tag: string,
    parentId: number | null,
    content: string,
    authorId: string,
): Promise<number> {
    const results: { id: number }[] = await db
        .insertInto('Post')
        .values({ content, parentId, authorId })
        .returning('id')
        .execute();

    const additionalExtractedTags = extractTags(content);
    const allTags = [tag, ...additionalExtractedTags];
    console.log(allTags);

    const createdPostId = results[0]!.id;

    const tagIds: number[] =
      await Promise.all(allTags.map((tag) => getOrInsertTagId(tag)))

    const direction: Direction = Direction.Up;
 
    await Promise.all(
      tagIds.map((tagId) =>
        insertVoteRecord(tagId, authorId, createdPostId, null, direction)
      )
    )

    await Promise.all(
      tagIds.map((tagId) => logAuthorView(authorId, tagId, createdPostId))
    )

    await Promise.all(
      allTags.map((tag) => clearRankingsCacheForTagPage(tag))
    )

    return createdPostId;
}

export async function getPost(id: number): Promise<Post> {

    let result: Post | undefined = await db.selectFrom('Post')
        .where('id', '=', id)
        .selectAll()
        .executeTakeFirst()

    assert(result != null, "result != null")
    return result
}

function extractTags(content: string): string[] {
    const regex = /#[a-zA-Z0-9]+/g;
    const matches = content.match(regex) || [];
    return matches.map((match) => match.slice(1));
}





