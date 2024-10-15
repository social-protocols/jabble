import type Immutable from 'immutable'
import { type FallacyList } from '#app/modules/fallacies/fallacy-types.ts'
import {
	type Effect,
	type VoteState,
	type Post,
} from '#app/modules/posts/post-types.ts'

export type MutableReplyTree = {
	post: Post
	score: number
	fallacyList: FallacyList
	replies: MutableReplyTree[]
}

export type ReplyTree = {
	post: Post
	score: number
	fallacyList: FallacyList
	replies: Immutable.List<ReplyTree>
}

export type PostState = {
	voteState: VoteState
	voteCount: number
	p: number | null
	effectOnTargetPost: Effect | null
	isDeleted: boolean
}

export type CommentTreeState = {
	targetPostId: number
	posts: {
		[key: number]: PostState
	}
}
