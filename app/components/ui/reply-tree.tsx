import { CONVINCINGNESS_THRESHOLD } from '#app/constants.ts'
import { type ReplyTree } from '#app/ranking.ts'
import { relativeEntropy } from '#app/utils/entropy.ts'
import { PostDetails } from './post.tsx'

export function TreeReplies({
	replyTree,
	loggedIn,
}: {
	replyTree: ReplyTree
	loggedIn: boolean
}) {
	const effectOnParentSize = relativeEntropy(
		replyTree.effect ? replyTree.effect.p : 0,
		replyTree.effect ? replyTree.effect.q : 0,
	)
	const isConvincing = effectOnParentSize > CONVINCINGNESS_THRESHOLD

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
							isConvincing={isConvincing}
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
