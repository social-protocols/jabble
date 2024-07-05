import { useNavigate } from '@remix-run/react'
import type * as Immutable from 'immutable'
import { useRef } from 'react'
import { type TreeContext } from '#app/routes/post.$postId.tsx'
import { type ImmutableReplyTree, type Post } from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'
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
	const postState = treeContext.commentTreeState.posts[post.id]
	invariant(
		postState !== undefined,
		`post ${post.id} not found in commentTreeState`,
	)

	const navigate = useNavigate()

	const isDeleted = postState.isDeleted

	const postDetailsRef = useRef<HTMLDivElement>(null) // used for scrolling to this post

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
				<PostActionBar
					key={`${post.id}-actionbar`}
					post={post}
					replyTree={replyTree}
					pathFromTargetPost={pathFromTargetPost}
					postDetailsRef={postDetailsRef}
					treeContext={treeContext}
				/>
			</div>
		</div>
	)
}
