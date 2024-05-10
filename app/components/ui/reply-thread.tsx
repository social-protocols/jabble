import { type ThreadPost } from '#app/conversations.ts'
import { Direction, type VoteState } from '#app/vote.ts'
import { PostDetails } from '#app/components/ui/post.tsx'

export function ReplyThread({
	posts,
	votes,
	targetId,
	criticalThreadId,
	loggedIn,
	onVote,
}: {
	posts: ThreadPost[]
	votes: Map<number, VoteState>
	targetId: number | null
	criticalThreadId: number | null
	loggedIn: boolean
	onVote?: Function
}) {
	const targetVote = votes.get(targetId!)!
	const targetHasVote = targetVote.vote !== Direction.Neutral

	return (
		<>
			{posts.map((post, i) => {
				let vote = votes.get(post.id)!

				const thisHasVote = vote.vote !== Direction.Neutral

				const needsVote = targetHasVote && !thisHasVote

				const borderStyle =
					criticalThreadId === post.id
						? needsVote
							? { borderLeft: 'solid blue 3px' }
							: { borderLeft: 'solid lightgrey 3px' }
						: {}

				return (
					<div key={post.id}>
						{i !== 0 && <div className="link-to-parent threadline" />}
						<div style={borderStyle} className="rounded-lg">
							<PostDetails
								post={post}
								note={null}
								teaser={true}
								voteState={vote}
								loggedIn={loggedIn}
								onVote={onVote}
							/>
						</div>
					</div>
				)
			})}
		</>
	)
}
