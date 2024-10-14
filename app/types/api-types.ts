import type Immutable from 'immutable'
import { type FallacyList } from '#app/modules/fallacies/fallacy-types.ts'
import {
	type Effect,
	type VoteState,
	type Post,
	type PostWithScore,
} from '#app/modules/posts/post-types.ts'

export type User = {
	id: string
	username: string
	isAdmin: number
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
