import type * as Immutable from 'immutable'

export type Post = {
	id: number
	parentId: number | null
	content: string
	// authorId: string
	createdAt: number
	deletedAt: number | null
	isPrivate: number
}

export type PostWithOSize = Post & { oSize: number }

export type FrontPagePost = Post & {
	oSize: number
	nTransitiveComments: number
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
	post: PostWithOSize
	effect: Effect | null // TODO: move to CommentTreeState
	replies: ReplyTree[]
}

export type ImmutableReplyTree = {
	post: PostWithOSize
	effect: Effect | null // TODO: move to CommentTreeState
	replies: Immutable.List<ImmutableReplyTree>
}

export type CommentTreeState = {
	criticalCommentId: number | null
	posts: {
		[key: number]: {
			p: number | null
			voteState: VoteState
			isDeleted: boolean
		}
	}
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
