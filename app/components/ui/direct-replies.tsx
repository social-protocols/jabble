import { PostDetails } from '#app/components/ui/post.tsx'
import { type ScoredPost } from '#app/ranking.ts'
import { type VoteState } from '#app/vote.ts'
import { DeletedPost } from './deleted-post.tsx'

export function DirectReplies({
	posts,
	voteStates,
	loggedIn,
	onVote,
}: {
	posts: ScoredPost[]
	voteStates: VoteState[]
	loggedIn: boolean
	onVote: Function
}) {
	const voteStatesMap = new Map<number, VoteState>()
	voteStates.forEach(voteState => {
		voteStatesMap.set(voteState.postId, voteState)
	})

	return (
		<>
			{posts.map(post => {
				const vs = voteStatesMap.get(post.id)
				return (
					<div key={post.id}>
						{post.deletedAt == null ? (
							<PostDetails
								post={post}
								teaser={true}
								voteState={vs}
								loggedIn={loggedIn}
								onVote={onVote}
							/>
						) : (
							<DeletedPost post={post} />
						)}
					</div>
				)
			})}
		</>
	)
}
