import { useNavigate } from '@remix-run/react'
import type Immutable from 'immutable'
import { useRef } from 'react'
import PollResult from '#app/components/building-blocks/poll-result.tsx'
import { PostActionBar } from '#app/components/building-blocks/post-action-bar.tsx'
import { PostContent } from '#app/components/building-blocks/post-content.tsx'
import { PostInfoBar } from '#app/components/building-blocks/post-info-bar.tsx'
import { postIsPoll } from '#app/modules/posts/post-service.ts'
import { VoteDirection } from '#app/modules/posts/post-types.ts'
import { type ReplyTree } from '#app/modules/posts/ranking/ranking-types.ts'
import { type TreeContext } from '#app/routes/post.$postId.tsx'
import { invariant } from '#app/utils/misc.tsx'

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
				<div className="mt-auto">
					<PostActionBar
						key={`${post.id}-actionbar`}
						replyTree={replyTree}
						pathFromTargetPost={pathFromTargetPost}
						postDetailsRef={postDetailsRef}
						treeContext={treeContext}
						postState={postState}
					/>
				</div>
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
