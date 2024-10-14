import type Immutable from 'immutable'
import { type FallacyList } from '#app/modules/fallacies/fallacy-types.ts'
import {
	type Effect,
	type VoteState,
	type Post,
	type PostWithScore,
} from '#app/modules/posts/post-types.ts'

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

export type CollapsedState = {
	currentlyFocussedPostId: number | null
	hidePost: Immutable.Map<number, boolean>
	hideChildren: Immutable.Map<number, boolean>
}
