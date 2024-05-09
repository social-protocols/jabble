import { PostDetails, ParentPost } from '#app/components/ui/post.tsx'
import { type RankedPost } from '#app/ranking.ts'
import { Direction, type VoteState } from '#app/vote.ts'

export function ReplyThread({
	posts,
	votes,
	targetId,
	criticalThreadId,
	loggedIn,
}: {
	posts: RankedPost[]
	votes: Map<number, VoteState>
	targetId: number | null
	criticalThreadId: number | null
	loggedIn: boolean
}) {
	const targetVote = votes.get(targetId!)!
	const targetHasVote = targetVote.vote !== Direction.Neutral

	return (
		<>
			{posts.map((post, i) => {
				let vote = votes.get(post.id)!

				const thisHasVote = vote.vote !== Direction.Neutral

				const needsVote = targetHasVote && !thisHasVote

				const borderStyle = criticalThreadId === post.id
					? needsVote
						? { borderLeft: 'solid blue 3px' }
						: { borderLeft: 'solid black 3px' }
					: {}

				return (
					<div key={post.id}>
						{
							i !== 0 && <div className="link-to-parent threadline" />
						}
						<div style={borderStyle}>
						<PostDetails
							post={post}
							note={null}
							teaser={true}
							vote={vote}
							loggedIn={loggedIn}
						/>
						</div>
					</div>
				)
			})}
		</>
	)
}
