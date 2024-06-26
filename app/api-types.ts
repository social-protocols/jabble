import * as Immutable from 'immutable'

export type ApiPost = {
	id: number
	parentId: number | null
	content: string
	authorId: string
	createdAt: number
	deletedAt: number | null
	isPrivate: number
}

export type ApiPostWithOSize = ApiPost & { oSize: number }

export type ApiFrontPagePost = ApiPost & { oSize: number, nTransitiveComments: number }

export type ApiEffect = {
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
	post: ApiPostWithOSize
	effect: ApiEffect | null // TODO: move to CommentTreeState
	replies: ReplyTree[]
}

export type ImmutableReplyTree = {
	post: ApiPostWithOSize
	effect: ApiEffect | null // TODO: move to CommentTreeState
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

export type ApiStatsPost = ApiPost & {
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

