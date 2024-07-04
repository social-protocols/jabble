import { useNavigate } from '@remix-run/react'
import type * as Immutable from 'immutable'
import { type Dispatch, type SetStateAction, useRef } from 'react'
import {
	Direction,
	type ImmutableReplyTree,
	type CommentTreeState,
	type Post,
	type CollapsedState,
} from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { PostActionBar } from './post-action-bar.tsx'
import { PostContent } from './post-content.tsx'
import { PostInfoBar } from './post-info-bar.tsx'
import { VoteButtons } from './vote-buttons.tsx'

/* Keep this relatively high, so people don't often have to click "read more"
   to read most content. But also not too high, so people don't have to
   scroll past big walls of text of posts they are not interested in */
const postTeaserMaxLines = 20

export function PostDetails({
	post,
	teaser,
	loggedIn,
	className,
	focussedPostId,
	pathFromFocussedPost,
	commentTreeState,
	setCommentTreeState,
	isCollapsedState,
	setIsCollapsedState,
	onReplySubmit,
	onCollapseParentSiblings,
	showInformativeProbability,
}: {
	post: Post
	teaser: boolean
	loggedIn: boolean
	className?: string
	focussedPostId: number
	pathFromFocussedPost: Immutable.List<number>
	commentTreeState: CommentTreeState
	setCommentTreeState: Dispatch<SetStateAction<CommentTreeState>>
	isCollapsedState: CollapsedState
	setIsCollapsedState: Dispatch<SetStateAction<CollapsedState>>
	onReplySubmit: (reply: ImmutableReplyTree) => void
	onCollapseParentSiblings: (
		pathFromFocussedPost: Immutable.List<number>,
	) => void
	showInformativeProbability: boolean
}) {
	const postState = commentTreeState.posts[post.id]
	invariant(
		postState !== undefined,
		`post ${post.id} not found in commentTreeState`,
	)

	const hidePost = isCollapsedState.hidePost.get(post.id) ?? false

	const hasUninformedVote: boolean =
		!postState.voteState.isInformed &&
		postState.voteState.vote !== Direction.Neutral

	const navigate = useNavigate()

	const marginLeft = loggedIn ? 'ml-[40px]' : 'ml-2'

	const isDeleted = postState.isDeleted

	const postDetailsRef = useRef<HTMLDivElement>(null)

	return (
		<div
			id={`post-${post.id}`}
			className={`flex w-full ${className ?? ''}`}
			ref={postDetailsRef}
		>
			{hidePost ? (
				<div className={'flex ' + marginLeft} />
			) : (
				<>
					<div style={{ display: loggedIn ? 'block' : 'none' }}>
						<VoteButtons
							postId={post.id}
							focussedPostId={focussedPostId}
							commentTreeState={commentTreeState}
							setCommentTreeState={setCommentTreeState}
							showInformedProbability={showInformativeProbability}
							isCollapsedState={isCollapsedState}
							setIsCollapsedState={setIsCollapsedState}
						/>
					</div>
					<div
						className={
							'ml-2 flex w-full min-w-0 flex-col' +
							(teaser ? ' postteaser' : '')
						}
					>
						<PostInfoBar post={post} postState={postState} />
						{!isDeleted ? (
							<PostContent
								content={post.content}
								maxLines={teaser ? postTeaserMaxLines : undefined}
								deactivateLinks={false}
								linkTo={`/post/${post.id}`}
							/>
						) : (
							<div
								style={{ cursor: 'pointer' }}
								className={'italic text-gray-400'}
								onClick={() =>
									`/post/${post.id}` && navigate(`/post/${post.id}`)
								}
							>
								This post was deleted.
							</div>
						)}
						<PostActionBar
							key={`${post.id}-actionbar`}
							post={post}
							focussedPostId={focussedPostId}
							loggedIn={loggedIn}
							isDeleted={isDeleted}
							setCommentTreeState={setCommentTreeState}
							onReplySubmit={onReplySubmit}
							pathFromFocussedPost={pathFromFocussedPost}
							isCollapsedState={isCollapsedState}
							onCollapseParentSiblings={onCollapseParentSiblings}
							postDetailsRef={postDetailsRef}
						/>
					</div>
				</>
			)}
		</div>
	)
}
