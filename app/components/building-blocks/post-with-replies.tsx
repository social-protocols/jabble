import { PostDetails } from '#app/components/building-blocks/post-details.tsx'
import { type ReplyTree } from '#app/modules/posts/ranking/ranking-types.ts'
import { type TreeContext } from '#app/routes/post.$postId.tsx'

export function PostWithReplies({
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
	const postId = replyTree.post.id

	const hidePost = treeContext.collapsedState.hidePost.get(postId) ?? false
	const hideChildren =
		treeContext.collapsedState.hideChildren.get(postId) ?? false

	return (
		!hidePost && (
			<>
				<PostDetails
					key={`${postId}-postdetails`}
					replyTree={replyTree}
					pathFromTargetPost={pathFromTargetPost}
					treeContext={treeContext}
					className={'mb-4 ' + (className ?? '')}
				/>
				{!hideChildren && (
					<div key={`${postId}-subtree`} className={'ml-2 pl-3'}>
						{replyTree.replies.map((tree: ReplyTree) => {
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
