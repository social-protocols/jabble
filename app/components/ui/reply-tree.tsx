import { type TreeContext } from '#app/routes/post.$postId.tsx'
import { type ImmutableReplyTree } from '#app/types/api-types.ts'
import { PostDetails } from './post-details.tsx'

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
	// TODO: new replies are not collapsed by focus button?
	const postId = replyTree.post.id

	const hidePost = treeContext.collapsedState.hidePost.get(postId) ?? false
	const hideChildren =
		(treeContext.collapsedState.hideChildren.get(postId) ?? false) || hidePost

	return (
		<>
			<PostDetails
				key={`${postId}-postdetails`}
				post={replyTree.post}
				className={(hidePost ? '' : 'mb-3 ') + (className ?? '')}
				pathFromTargetPost={pathFromTargetPost}
				treeContext={treeContext}
			/>
			{!hideChildren && (
				<div key={`${postId}-subtree`} className={'ml-2 pl-3'}>
					<TreeReplies
						replyTree={replyTree}
						pathFromTargetPost={pathFromTargetPost}
						treeContext={treeContext}
					/>
				</div>
			)}
		</>
	)
}

function TreeReplies({
	replyTree,
	pathFromTargetPost,
	treeContext,
}: {
	replyTree: ImmutableReplyTree
	pathFromTargetPost: Immutable.List<number>
	treeContext: TreeContext
}) {
	// The purpose of this component is to be able to give state to its children
	// so that each one can maintain and update its own children state.
	return (
		<>
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
		</>
	)
}
