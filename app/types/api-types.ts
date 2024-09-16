import type * as Immutable from 'immutable'
import { type FallacyList } from '#app/repositories/fallacy-detection.ts'

export type Post = {
	id: number
	parentId: number | null
	content: string
	// authorId: string
	createdAt: number
	deletedAt: number | null
	isPrivate: number
	pollType: PollType | null
}

export type User = {
	id: string
	username: string
	isAdmin: number
}

export type PostWithScore = Post & { score: number }

export type FrontPagePost = Post & {
	fallacyList: FallacyList
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

export type PlaygroundPost = {
	id: number
	content: string
	detection: FallacyList
	createdAt: number
}

export enum PollType {
	FactCheck = 'factCheck',
	Opinion = 'opinion',
}

export type Artefact = {
	id: number
	url: string
	description: string | null
	createdAt: number
}

export type Claim = {
	id: number
	claim: string
}
