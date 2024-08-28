import type * as Immutable from 'immutable'
import { type FallacyDetection } from '#app/utils/fallacy_detection.js'

export type Post = {
	id: number
	parentId: number | null
	content: string
	// authorId: string
	createdAt: number
	deletedAt: number | null
	isPrivate: number
}

export type User = {
	id: string
	username: string
	isAdmin: number
}

export type PostWithScore = Post & { score: number }

export type FrontPagePost = Post & {
	fallacyDetection: FallacyDetection | null
	oSize: number
	nTransitiveComments: number
	p: number
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
	fallacyDetection: FallacyDetection | null
	replies: ReplyTree[]
}

export type ImmutableReplyTree = {
	post: Post
	fallacyDetection: FallacyDetection | null
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

export type StatsPost = Post & {
	voteEventId: number
	voteEventTime: number
	postId: number
	o: number
	oCount: number
	oSize: number
	p: number
	score: number

	commentId: number | null
	pCount: number
	pSize: number
	q: number
	qCount: number
	qSize: number
	r: number
	weight: number

	criticalThreadId: number | null
}
