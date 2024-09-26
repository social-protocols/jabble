import { PostDetails } from '#app/components/building-blocks/post-details.tsx'
import { type TreeContext } from '#app/routes/post.$postId.tsx'
import { type ImmutableReplyTree } from '#app/types/api-types.ts'

export function PostWithReplies({
	replyTree,
	pathFromTargetPost,
	treeContext,
	className,
}: {
	replyTree: ImmutableReplyTree
	pathFromTargetPost: Immutable.List<number>
	treeContext: TreeContext
	className?: string
}) {
	const postId = replyTree.post.id

	const hidePost = treeContext.collapsedState.hidePost.get(postId) ?? false
	const hideChildren =
		treeContext.collapsedState.hideChildren.get(postId) ?? false

	return (
		!hidePost && (
			<>
				<PostDetails
					key={`${postId}-postdetails`}
					post={replyTree.post}
					fallacyList={replyTree.fallacyList}
					className={'mb-4 ' + (className ?? '')}
					replyTree={replyTree}
					pathFromTargetPost={pathFromTargetPost}
					treeContext={treeContext}
				/>
				{!hideChildren && (
					<div key={`${postId}-subtree`} className={'ml-2 pl-3'}>
						{replyTree.replies.map((tree: ImmutableReplyTree) => {
							return (
								<PostWithReplies
									key={`${treeContext.targetPostId}-${tree.post.id}`}
									replyTree={tree}
									pathFromTargetPost={pathFromTargetPost.push(tree.post.id)}
									treeContext={treeContext}
								/>
							)
						})}
					</div>
				)}
			</>
		)
	)
}
