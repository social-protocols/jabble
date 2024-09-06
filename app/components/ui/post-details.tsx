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
import { type FallacyList } from '#app/utils/fallacy_detection.ts'
import { invariant } from '#app/utils/misc.tsx'
import { useOptionalUser } from '#app/utils/user.ts'
import { PostActionBar } from './post-action-bar.tsx'
import { PostContent } from './post-content.tsx'
import { PostInfoBar } from './post-info-bar.tsx'

export function PostDetails({
	post,
	fallacyList,
	className,
	replyTree,
	pathFromTargetPost,
	treeContext,
}: {
	post: Post
	fallacyList: FallacyList
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

	const isTopLevelPost = post.parentId === null

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
				<PostInfoBar
					post={post}
					fallacyList={fallacyList}
					postState={postState}
				/>
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
				{isTargetPost &&
					isTopLevelPost &&
					treeContext.isFactCheck &&
					(loggedIn ? (
						<div className="my-2 space-x-4">
							<button
								title={'Upvote'}
								onClick={async () => await submitVote(Direction.Up)}
								className={
									'rounded-full px-4 py-2 text-primary-foreground ' +
									(postState.voteState.vote == Direction.Up
										? 'bg-primary text-primary-foreground'
										: 'text-secondary-foreground outline outline-2 outline-secondary-foreground')
								}
							>
								True
							</button>
							<button
								title={'Downvote'}
								onClick={async () => await submitVote(Direction.Down)}
								className={
									'rounded-full px-4 py-2 text-primary-foreground ' +
									(postState.voteState.vote == Direction.Down
										? 'bg-primary text-primary-foreground'
										: 'text-secondary-foreground outline outline-2 outline-secondary-foreground')
								}
							>
								False
							</button>
						</div>
					) : (
						<div className="mt-2 text-sm opacity-50">
							<Link to="/login">Log in to comment and vote.</Link>
						</div>
					))}
				<PostActionBar
					key={`${post.id}-actionbar`}
					post={post}
					replyTree={replyTree}
					pathFromTargetPost={pathFromTargetPost}
					postDetailsRef={postDetailsRef}
					treeContext={treeContext}
					postState={postState}
				/>
			</div>

			{isTargetPost && isTopLevelPost && treeContext.isFactCheck && (
				<div className="mx-2 min-w-32 space-y-1 opacity-50">
					<div className="text-sm">Accuracy estimate:</div>
					<div className="text-5xl">
						<Link
							title="Probability of the claim being true"
							to={`/stats/${post.id}`}
						>
							{pCurrentString}
						</Link>
					</div>
					<div
						title="Number of votes this result is based on"
						className="text-sm"
					>
						{postState.voteCount} {postState.voteCount == 1 ? 'vote' : 'votes'}
					</div>
				</div>
			)}
		</div>
	)
}
