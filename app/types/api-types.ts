import type * as Immutable from 'immutable'
import { type FallacyList } from '#app/modules/fallacies/fallacy-types.ts'
import { type Post, type PostWithScore } from '#app/modules/posts/post-types.ts'

export type User = {
	id: string
	username: string
	isAdmin: number
}

export type Effect = {
	postId: number
	commentId: number | null
	p: number
	pCount: number
	pSize: number
	q: number
	qCount: number
	qSize: number
	r: number
	weight: number
}

export type ReplyTree = {
	post: PostWithScore
	fallacyList: FallacyList
	replies: ReplyTree[]
}

export type ImmutableReplyTree = {
	post: Post
	fallacyList: FallacyList
	replies: Immutable.List<ImmutableReplyTree>
}

export type PostState = {
	criticalCommentId: number | null
	voteState: VoteState
	voteCount: number
	p: number | null
	effectOnTargetPost: Effect | null
	isDeleted: boolean
}

export type CommentTreeState = {
	targetPostId: number
	criticalCommentIdToTargetId: {
		[key: number]: number[]
	}
	posts: {
		[key: number]: PostState
	}
}

export type CollapsedState = {
	currentlyFocussedPostId: number | null
	hidePost: Immutable.Map<number, boolean>
	hideChildren: Immutable.Map<number, boolean>
}

export enum Direction {
	Up = 1,
	Down = -1,
	Neutral = 0,
}

export type VoteState = {
	postId: number
	vote: Direction
	isInformed: boolean
}

export type Artefact = {
	id: number
	url: string
	createdAt: number
}

export type Claim = {
	id: number
	claim: string
}

export type Quote = {
	id: number
	artefactId: number
	quote: string
	createdAt: number
}

export type CandidateClaim = {
	id: number
	artefactId: number
	quoteId: number
	claim: string
	postId: number | null
	createdAt: number
}

export type QuoteFallacy = {
	id: number
	quoteId: number
	name: string
	rationale: string
	probability: number
	createdAt: number
}
