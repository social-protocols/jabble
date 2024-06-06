import { type ReplyTree } from '#app/ranking.ts'
import { PostDetails } from './post.tsx'

export function TreeReplies({
	replyTree,
	loggedIn,
}: {
	replyTree: ReplyTree
	loggedIn: boolean
}) {
	if (replyTree.replies.length === 0) {
		return <></>
	}
	return (
		<>
			{replyTree.replies.map(tree => {
				return (
					<>
						<PostDetails
							key={tree.post.id}
							post={tree.post}
							teaser={false}
							voteState={tree.voteState}
							loggedIn={loggedIn}
						/>
						<div
							key={`${tree.post.id}-threadline`}
							className={'border-left-solid ml-2 border-l-4 border-post pl-3'}
						>
							<TreeReplies
								key={`${tree.post.id}-children`}
								replyTree={tree}
								loggedIn={loggedIn}
							/>
						</div>
					</>
				)
			})}
		</>
	)
}
