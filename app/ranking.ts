// import assert from 'assert';

import { QueryResult, sql } from 'kysely';
import { type Post } from '#app/db/types.ts'; // this is the Database interface we defined earlier
import { db } from "#app/db.ts";
import { cumulativeAttention } from './attention.ts';
import { informedProbability } from './probabilities.ts';
import { getOrInsertTagId } from './tag.ts';

type PostWithAttention = Post & { attention: number }
type RankedPost = PostWithAttention & { score: number, explorationPool: boolean, oneBasedRank: number }

export async function getRankedPosts(tag: string): Promise<PostWithAttention[]> {
	// first, select candidate posts (e.g. less than a certain age, greater than a certain p, greater than a certain attention)
	// For now, just select all posts where there has been one vote for this tag.
	// type RankedPost = Post & { score: number, explorationBool: boolean }

	console.log("Tag", tag)
	let tagId = await getOrInsertTagId(tag)
	console.log("TagID", tagId)


	// let candidatePosts: PostWithAttention[] = (await sql<PostWithAttention>`
	// 	select 
	// 		COALESCE(CumulativeStats.attention, 0) as "attention"
	// 		, "Post".* 
	// 		from "Post" 
	// 		inner join "CurrentTally" 
	// 			on "CurrentTally"."postId" = "Post"."id" 
	// 	 		and "CurrentTally"."tagId" = 0 
	// 		left join "CumulativeStats" 
	// 			on "CumulativeStats"."postId" = "Post"."id"
	// 			and "CumulativeStats"."tagId" = 0
	// 		where Post.parentID is null;
	// `.execute(db)).rows


	let candidatePosts: PostWithAttention[] = await db
		.selectFrom('Post')
		.innerJoin('CurrentTally', 'CurrentTally.postId', 'Post.id')
		.where('CurrentTally.tagId', '=', tagId)
		.leftJoin('CumulativeStats', 'CumulativeStats.postId', 'Post.id')
		.where('CumulativeStats.tagId', '=', tagId)
		.select(
			sql<number>`COALESCE(CumulativeStats.attention, 0)`.as('attention')
		)
		.selectAll('Post')
		.execute()



	console.log("Result", candidatePosts)

	console.log("Candidate posts", candidatePosts)

	// // then sort by score
	// // let sortedPosts = candidatePosts.sort((a, b) => await score(tagId, a.id) - await score(tagId, b.id))
	let RankedPosts = await Promise.all(candidatePosts.map(async post => {
		let s = { score: await score(tag, post.id), explorationPool: false }
		return {
			...post, ...s
		}
	}))

	let sortedPosts = RankedPosts
		.sort((a, b) => { return a.score - b.score })
		.map((post, i) => {
			let s = { oneBasedRank: i + 1 }
			return { ...post, ...s }
		})


	// // Now, choose one random post that has no attention (cumulative_stats.attention == 0)
	// // Use a DB query that does a negative join against the cumulativeStats table
	// let explorationPool = RankedPosts.filter(post => post.attention == 0)

	// // then, randomly choose one of the posts in that rank as exploration post
	// let explorationPost = explorationPool[Math.floor(Math.random() * explorationPool.length)]
	// explorationPost.explorationPool = true

	// // then, randomly choose one of top 30 ranks as exploration impression
	// // random number between 1 and 30
	// let explorationRank = Math.floor(Math.random() * 30) + 1

	// // then splice in explorationPost into sortedPosts before item at explorationPost
	// sortedPosts.splice(explorationRank, 0, explorationPost)

	// console.log("Sorted posts", sortedPosts)

	return sortedPosts

	// then, create link that has eRank of eImpression

	// then, log eVote when 
	// then, weight factors is just average of eVote / eImpression group by rank
	// then, return list of posts with ranks
}





// then, choose exploration post
// insert into list and select post data


async function score(tag: string, postId: number): Promise<number> {
	// find informed probability

	let tagId = await getOrInsertTagId(tag)

	let q = await informedProbability(tag, postId)

	let a = await cumulativeAttention(tagId, postId)
	let fatigueFactor = .9
	// The formula below gives us attention adjusted for fatigue. 
	// Our decay model says that effective attention (e.g. the vote rate) decays exponentially, so the *derivative* of the formula below
	// should be e**(-fatigueFactor*a). So the function below starts at being roughly equal to a but then as a increases
	// it levels off.
	let adjustedAttention = (1 - Math.exp(-fatigueFactor * a)) / fatigueFactor

	return Math.log2(q) / adjustedAttention
}


// function explorationPosts(tagId: number, explorationPool: number[]): postId {



// Exploration Pool Logic:
//     R% of impressions at each rank are exploration pool
//     so for each rank, exploration impression with probability of R
//     randomly choose post from exploration pool
//         exploration pool is posts with less than certain amount of attention
//             or better, with a certain confidence interval
//     increment impression count at that rank
//     increment cumulative attention of post
//     create link that has eRank of eImpression
//     log eVote when 
//     weight factors is just average of eVote / eImpression group by rank


// }





