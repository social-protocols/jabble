import { type Dispatch, type SetStateAction } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { CONVINCINGNESS_THRESHOLD } from '#app/constants.ts'
import { type CommentTreeState, type ReplyTree } from '#app/ranking.ts'
import { relativeEntropy } from '#app/utils/entropy.ts'
import { Direction } from '#app/vote.ts'
import { PostDetails } from './post-details.tsx'

export function TreeReplies({
	replyTree,
	criticalCommentId,
	targetHasVote,
	loggedIn,
	focussedPostId,
	postDataState,
	setPostDataState,
}: {
	replyTree: ReplyTree
	criticalCommentId: number | null
	targetHasVote: boolean
	loggedIn: boolean
	focussedPostId: number
	postDataState: CommentTreeState
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
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
					criticalCommentId == tree.post.id &&
					targetHasVote &&
					tree.voteState.vote == Direction.Neutral
				const indicatorTWClass = voteHereIndicator
					? 'border-l-blue-500 border-solid border-l-4 pl-2 dark:border-l-[#7dcfff]'
					: 'border-l-transparent border-solid border-l-4 pl-2'
				return (
					<Fragment key={tree.post.id}>
						<div className={indicatorTWClass}>
							<PostDetails
								post={tree.post}
								teaser={false}
								voteState={tree.voteState}
								loggedIn={loggedIn}
								isConvincing={isConvincing}
								voteHereIndicator={voteHereIndicator}
								className="mt-3"
								focussedPostId={focussedPostId}
								postDataState={postDataState}
								setPostDataState={setPostDataState}
							/>
						</div>
						<div
							className={
								'border-left-solid mb-2 ml-2 border-l-4 border-post border-transparent pl-3'
							}
						>
							<TreeReplies
								replyTree={tree}
								criticalCommentId={criticalCommentId}
								targetHasVote={tree.voteState.vote !== Direction.Neutral}
								loggedIn={loggedIn}
								focussedPostId={focussedPostId}
								postDataState={postDataState}
								setPostDataState={setPostDataState}
							/>
						</div>
					</Fragment>
				)
			})}
		</>
	)
}
