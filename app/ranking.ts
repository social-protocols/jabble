// import assert from 'assert';

import { db } from "#app/db.ts";
import { type Post } from '#app/db/types.ts'; // this is the Database interface we defined earlier
import { QueryResult, sql } from 'kysely';
import { cumulativeAttention } from './attention.ts';
import { findTopNoteId } from './probabilities.ts';
import { getOrInsertTagId } from './tag.ts';


type ScoreData = {
	a: number,
	p: number,
	q: number,
	score: number
}

type PostWithAttention = Post & { attention: number }
type RankedPost = PostWithAttention & ScoreData & { explorationPool: boolean, oneBasedRank: number }

const fatigueFactor = .9


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


	let query = db
		.selectFrom('Post')
		.innerJoin('CurrentTally', 'CurrentTally.postId', 'Post.id')
		.where('CurrentTally.tagId', '=', tagId)
		.leftJoin(
			'CumulativeStats',
			(join) => join
				.onRef('CumulativeStats.postId', '=', 'Post.id')
				.on('CumulativeStats.tagId', '=', tagId)
		)
		.select(
			sql<number>`COALESCE(CumulativeStats.attention, 0)`.as('attention')
		)
		.selectAll('Post')
		;


	console.log("Query is", query.compile())
	
	let candidatePosts: PostWithAttention[] = await query.execute()


	console.log("Result", candidatePosts)

	console.log("Candidate posts", candidatePosts)

	// // then sort by score
	// // let sortedPosts = candidatePosts.sort((a, b) => await score(tagId, a.id) - await score(tagId, b.id))
	let RankedPosts = await Promise.all(candidatePosts.map(async post => {
		let s = await score(tag, post.id)

		return {
			...post, ...s
		}
	}))

	let sortedPosts = RankedPosts
		.sort((a, b) => { return a.score - b.score })
		.map((post, i) => {
			let s = { oneBasedRank: i + 1, explorationPool: false }
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





async function score(tag: string, postId: number): Promise<ScoreData> {
	// find informed probability

	let tagId = await getOrInsertTagId(tag)

	// let q = await informedProbability(tag, postId)

	const [_topNoteId, p, q] = await findTopNoteId(tagId, postId);


	let a = await cumulativeAttention(tagId, postId)
	// The formula below gives us attention adjusted for fatigue. 
	// Our decay model says that effective attention (e.g. the vote rate) decays exponentially, so the *derivative* of the formula below
	// should be e**(-fatigueFactor*a). So the function below starts at being roughly equal to a but then as a increases
	// it levels off.
	let adjustedAttention = (1 - Math.exp(-fatigueFactor * a)) / fatigueFactor

	return {
		a: a,
		p: p,
		q: q,
		score: Math.log2(q) / adjustedAttention
	}
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





