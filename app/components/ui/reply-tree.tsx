import { CONVINCINGNESS_THRESHOLD } from '#app/constants.ts'
import { type ReplyTree } from '#app/ranking.ts'
import { relativeEntropy } from '#app/utils/entropy.ts'
import { Direction } from '#app/vote.ts'
import { PostDetails } from './post-details.tsx'

export function TreeReplies({
	replyTree,
	criticalCommentIds,
	targetHasVote,
	loggedIn,
}: {
	replyTree: ReplyTree
	criticalCommentIds: number[]
	targetHasVote: boolean
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
				const voteHereIndicator =
					criticalCommentIds.includes(tree.post.id) &&
					targetHasVote &&
					tree.voteState.vote == Direction.Neutral
				const updCriticalCommentIds = criticalCommentIds.concat(
					tree.post.criticalThreadId !== null
						? [tree.post.criticalThreadId]
						: [],
				)
				return (
					<>
						<PostDetails
							key={tree.post.id}
							post={tree.post}
							teaser={false}
							voteState={tree.voteState}
							loggedIn={loggedIn}
							isConvincing={isConvincing}
							voteHereIndicator={voteHereIndicator}
						/>
						<div
							key={`${tree.post.id}-threadline`}
							className={
								'border-left-solid mb-2 ml-2 border-l-4 border-post pl-3'
							}
						>
							<TreeReplies
								key={`${tree.post.id}-children`}
								replyTree={tree}
								criticalCommentIds={updCriticalCommentIds}
								targetHasVote={tree.voteState.vote !== Direction.Neutral}
								loggedIn={loggedIn}
							/>
						</div>
					</>
				)
			})}
		</>
	)
}
