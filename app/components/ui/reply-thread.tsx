import { PostDetails, ParentPost } from '#app/components/ui/post.tsx'
import { type RankedPost } from '#app/ranking.ts'
import { Direction, type VoteState } from '#app/vote.ts'

export function ReplyThread({
	posts,
	votes,
	targetId,
	loggedIn,
}: {
	posts: RankedPost[]
	votes: Map<number, VoteState>
	targetId: number | null
	loggedIn: boolean
}) {
	const targetVote = votes.get(targetId!)!
	const targetHasVote = targetVote.vote !== Direction.Neutral

	return (
		<>
			{posts.map((post, i) => {
				let vote = votes.get(post.id)!

				let followsParent = (i > 0 && posts[i - 1]!.id) == post.parentId
				const directReply = targetId !== null && post.parentId == targetId

				const thisHasVote = vote.vote !== Direction.Neutral

				const needsVote = targetHasVote && !thisHasVote

				const borderStyle = post.isCritical
					? needsVote
						? { borderLeft: 'solid blue 3px' }
						: { borderLeft: 'solid black 3px' }
					: {}

				return (
					<div key={post.id} style={borderStyle}>
						{!directReply &&
							post.parent !== null &&
							(followsParent ? (
								<div className="link-to-parent threadline" />
							) : (
								<ParentPost parentPost={post.parent!} tag={post.tag} />
							))}
						<PostDetails
							post={post}
							note={null}
							teaser={true}
							vote={vote}
							loggedIn={loggedIn}
						/>
					</div>
				)
			})}
		</>
	)
}
