import { Link, useNavigate } from '@remix-run/react'
import type Immutable from 'immutable'
import { useRef } from 'react'
import PollResult from '#app/components/building-blocks/poll-result.tsx'
import { PostActionBar } from '#app/components/building-blocks/post-action-bar.tsx'
import { PostContent } from '#app/components/building-blocks/post-content.tsx'
import { PostInfoBar } from '#app/components/building-blocks/post-info-bar.tsx'
import { postIsPoll } from '#app/modules/posts/post-service.ts'
import {
	type Poll,
	PollType,
	VoteDirection,
} from '#app/modules/posts/post-types.ts'
import {
	type CommentTreeState,
	type ReplyTree,
	type PostState,
} from '#app/modules/posts/ranking/ranking-types.ts'
import { type TreeContext } from '#app/routes/post.$postId.tsx'
import { invariant } from '#app/utils/misc.tsx'
import { useOptionalUser } from '#app/utils/user.ts'

export function PostDetails({
	replyTree,
	pathFromTargetPost,
	treeContext,
	className,
}: {
	replyTree: ReplyTree
	pathFromTargetPost: Immutable.List<number>
	treeContext: TreeContext
	className?: string
}) {
	const post = replyTree.post
	const fallacyList = replyTree.fallacyList
	const postState = treeContext.commentTreeState.posts[post.id]
	invariant(
		postState !== undefined,
		`post ${post.id} not found in commentTreeState`,
	)

	const navigate = useNavigate()

	const postDetailsRef = useRef<HTMLDivElement>(null) // used for scrolling to this post

	const isPoll = postIsPoll(post)
	const isDeleted = postState.isDeleted
	const isTargetPost = treeContext.targetPostId === post.id
	const isTopLevelPost = post.parentId === null
	const userHasVoted = postState.voteState.vote != VoteDirection.Neutral

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
				{isTargetPost && isTopLevelPost && isPoll && (
					<PollVoteButtons
						poll={post}
						postState={postState}
						treeContext={treeContext}
					/>
				)}
				<PostActionBar
					key={`${post.id}-actionbar`}
					replyTree={replyTree}
					pathFromTargetPost={pathFromTargetPost}
					postDetailsRef={postDetailsRef}
					treeContext={treeContext}
					postState={postState}
				/>
			</div>

			{isTargetPost && isTopLevelPost && isPoll && (
				<PollResult
					postId={post.id}
					pCurrent={postState.p || NaN}
					voteCount={postState.voteCount}
					pollType={post.pollType}
				/>
			)}
		</div>
	)
}

function PollVoteButtons({
	poll,
	postState,
	treeContext,
}: {
	poll: Poll
	postState: PostState
	treeContext: TreeContext
}) {
	const user = useOptionalUser()
	const loggedIn: boolean = user !== null

	const submitVote = async function (direction: VoteDirection) {
		const payLoad = {
			postId: poll.id,
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

	// TODO: handle else case properly
	const upvoteLabel = poll.pollType == PollType.FactCheck ? 'True' : 'Agree'

	// todo: handle else case properly
	const downvoteLabel =
		poll.pollType == PollType.FactCheck ? 'False' : 'Disagree'

	return loggedIn ? (
		<div className="my-2 space-x-4">
			<button
				title={'Upvote'}
				onClick={async () => await submitVote(VoteDirection.Up)}
				className={
					'rounded-full px-4 py-2 text-primary-foreground ' +
					(postState.voteState.vote == VoteDirection.Up
						? 'bg-primary text-primary-foreground'
						: 'text-secondary-foreground outline outline-2 outline-secondary-foreground')
				}
			>
				{upvoteLabel}
			</button>
			<button
				title={'Downvote'}
				onClick={async () => await submitVote(VoteDirection.Down)}
				className={
					'rounded-full px-4 py-2 text-primary-foreground ' +
					(postState.voteState.vote == VoteDirection.Down
						? 'bg-primary text-primary-foreground'
						: 'text-secondary-foreground outline outline-2 outline-secondary-foreground')
				}
			>
				{downvoteLabel}
			</button>
		</div>
	) : (
		<div className="mt-2 text-sm opacity-50">
			<Link to="/login">Log in to comment and vote.</Link>
		</div>
	)
}
