import { sql, type Transaction } from 'kysely'
import { type DB } from '#app/database/types.ts'
import { getArtefact } from '#app/modules/claims/artefact-repository.ts'
import {
	getClaim,
	updatePostIdOnClaim,
} from '#app/modules/claims/claim-repository.ts'
import { getQuote } from '#app/modules/claims/quote-repository.ts'
import {
	getDescendantCount,
	getPost,
} from '#app/modules/posts/post-repository.ts'
import { createPost } from '#app/modules/posts/post-service.ts'
import { type Poll, type PollType, type Post } from '../post-types.ts'

export async function getOrCreatePoll(
	trx: Transaction<DB>,
	userId: string,
	claimId: number,
	pollType: PollType,
): Promise<Post> {
	const existingPoll = await trx
		.selectFrom('Post')
		.innerJoin('Poll', 'Poll.postId', 'Post.id')
		.innerJoin('Claim', 'Claim.postId', 'Post.id')
		.where('Claim.id', '=', claimId)
		.where('Poll.pollType', '=', pollType)
		.selectAll('Post')
		.select(['Poll.pollType as pollType'])
		.executeTakeFirst()

	if (existingPoll !== undefined) {
		return {
			id: existingPoll.id,
			parentId: existingPoll.parentId,
			content: existingPoll.content,
			createdAt: existingPoll.createdAt,
			deletedAt: existingPoll.deletedAt,
			isPrivate: existingPoll.isPrivate,
			pollType: existingPoll.pollType as PollType,
		}
	}

	const claim = await getClaim(trx, claimId)

	// TODO: createPost should return the entire post
	const postId = await createPost(trx, null, claim.claim, userId, {
		isPrivate: false,
		withUpvote: false,
	})

	await updatePostIdOnClaim(trx, claimId, postId)

	await trx
		.insertInto('Poll')
		.values({
			claimId: claimId,
			postId: postId,
			pollType: pollType,
		})
		.execute()

	return await getPost(trx, postId)
}

export async function getPollPost(
	trx: Transaction<DB>,
	postId: number,
): Promise<Poll> {
	// TODO: check whether the post is actually a poll

	let query = trx
		.selectFrom('Post')
		.where('Post.parentId', 'is', null)
		.where('Post.deletedAt', 'is', null)
		.where('Post.id', '=', postId)
		.innerJoin('Poll', 'Poll.postId', 'Post.id')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', 'PostStats.postId', 'Post.id')
		.leftJoin('Claim', 'Claim.postId', 'Post.id')
		.leftJoin('Quote', 'Quote.id', 'Claim.quoteId')
		.leftJoin('Artefact', 'Artefact.id', 'Quote.artefactId')
		.where('Poll.pollType', 'is not', null)
		.selectAll('Post')
		.selectAll('FullScore')
		.selectAll('Poll')
		.select(['Artefact.id as artefactId', 'Quote.id as quoteId'])
		.select(sql<number>`replies`.as('nReplies'))
		.orderBy('Post.createdAt', 'desc')

	const post = await query.executeTakeFirstOrThrow()

	return {
		id: post.id,
		parentId: post.parentId,
		content: post.content,
		createdAt: post.createdAt,
		deletedAt: post.deletedAt,
		isPrivate: post.isPrivate,
		pollType: post.pollType ? (post.pollType as PollType) : null,
		context: post.artefactId
			? {
					artefact: await getArtefact(trx, post.artefactId),
					quote: post.quoteId ? await getQuote(trx, post.quoteId) : null,
				}
			: null,
		oSize: post.oSize,
		nTransitiveComments: await getDescendantCount(trx, post.id),
		p: post.p,
	}
}
