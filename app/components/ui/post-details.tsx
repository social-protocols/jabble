import { Link, useNavigate } from '@remix-run/react'
import type * as Immutable from 'immutable'
import { useRef } from 'react'
import { type TreeContext } from '#app/routes/post.$postId.tsx'
import {
	type CommentTreeState,
	Direction,
	type ImmutableReplyTree,
	type Post,
} from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from './button.tsx'
import { PostActionBar } from './post-action-bar.tsx'
import { PostContent } from './post-content.tsx'
import { PostInfoBar } from './post-info-bar.tsx'

export function PostDetails({
	post,
	className,
	replyTree,
	pathFromTargetPost,
	treeContext,
}: {
	post: Post
	className?: string
	replyTree: ImmutableReplyTree
	pathFromTargetPost: Immutable.List<number>
	treeContext: TreeContext
}) {
	const user = useOptionalUser()
	const loggedIn: boolean = user !== null

	const postState = treeContext.commentTreeState.posts[post.id]
	invariant(
		postState !== undefined,
		`post ${post.id} not found in commentTreeState`,
	)

	const navigate = useNavigate()

	const isDeleted = postState.isDeleted

	const postDetailsRef = useRef<HTMLDivElement>(null) // used for scrolling to this post

	const isTargetPost = treeContext.targetPostId === post.id

	const userHasVoted = postState.voteState.vote != Direction.Neutral

	const pCurrent: number = treeContext.commentTreeState.posts[post.id]?.p || NaN
	const pCurrentString: String = (pCurrent * 100).toFixed(0) + '%'

	const submitVote = async function (direction: Direction) {
		const payLoad = {
			postId: post.id,
			focussedPostId: treeContext.targetPostId,
			direction: direction,
			currentVoteState: postState.voteState.vote,
		}
		const response = await fetch('/vote', {
			method: 'POST',
			body: JSON.stringify(payLoad),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		const newCommentTreeState = (await response.json()) as CommentTreeState
		treeContext.setCommentTreeState(newCommentTreeState)
	}

	return (
		<div
			id={`post-${post.id}`}
			className={`flex w-full ${className ?? ''}`}
			ref={postDetailsRef}
		>
			<div className={'ml-2 flex w-full min-w-0 flex-col'}>
				<PostInfoBar post={post} postState={postState} />
				{!isDeleted ? (
					<PostContent
						className={!isTargetPost && userHasVoted ? 'opacity-50' : ''}
						content={post.content}
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
				) : (
					<div
						style={{ cursor: 'pointer' }}
						className={'italic text-gray-400'}
						onClick={() => `/post/${post.id}` && navigate(`/post/${post.id}`)}
					>
						This post was deleted.
					</div>
				)}
				{isTargetPost && loggedIn ? (
					<div className="my-2 space-x-4">
						<Button
							title={'Upvote'}
							onClick={async () => await submitVote(Direction.Up)}
							className={
								postState.voteState.vote == Direction.Up ? '' : 'opacity-50'
							}
						>
							True
						</Button>
						<Button
							title={'Downvote'}
							onClick={async () => await submitVote(Direction.Down)}
							className={
								postState.voteState.vote == Direction.Down ? '' : 'opacity-50'
							}
						>
							False
						</Button>
					</div>
				) : (
					<div className="opacity-50">
						<Link to="/login">Log in to comment and vote.</Link>
					</div>
				)}
				<PostActionBar
					key={`${post.id}-actionbar`}
					post={post}
					replyTree={replyTree}
					pathFromTargetPost={pathFromTargetPost}
					postDetailsRef={postDetailsRef}
					treeContext={treeContext}
				/>
			</div>

			{isTargetPost && (
				<div className="mx-2 opacity-50">
					<div className="text-xs">True:</div>
					<div className="text-5xl">
						<Link
							title="Informed probability of truth"
							to={`/stats/${post.id}`}
						>
							{pCurrentString}
						</Link>
					</div>
				</div>
			)}
		</div>
	)
}
