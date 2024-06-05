import { PostDetails } from '#app/components/ui/post.tsx'
import { type ThreadPost } from '#app/conversations.ts'
import { Direction, type VoteState } from '#app/vote.ts'
import { DeletedPost } from './deleted-post.tsx'

const CONVINCINGNESS_THRESHOLD = 0.1

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
	targetId: number
	criticalThreadId: number | null
	loggedIn: boolean
	onVote?: Function
}) {
	const targetVote = votes.get(targetId)

	// "target" denotes the focused post which has an (un)informed vote that determines the colored marker on this post
	const targetHasVote =
		targetVote !== undefined && targetVote.vote !== Direction.Neutral

	return (
		<>
			{posts.map((post, i) => {
				let vote = votes.get(post.id)

				const thisHasVote =
					vote !== undefined && vote.vote !== Direction.Neutral

				const needsVote = targetHasVote && !thisHasVote

				const isConvincing = post.effectOnParentSize
					? post.effectOnParentSize > CONVINCINGNESS_THRESHOLD
					: false

				const borderStyle =
					criticalThreadId === post.id
						? needsVote
							? { borderLeft: 'solid blue 3px' }
							: { borderLeft: 'solid lightgrey 3px' }
						: {}

				return (
					<div key={post.id}>
						{i !== 0 && <div className="link-to-parent threadline" />}
						{post.deletedAt == null ? (
							<div style={borderStyle} className="rounded-lg">
								<PostDetails
									post={post}
									teaser={true}
									voteState={vote}
									loggedIn={loggedIn}
									onVote={onVote}
									isConvincing={isConvincing}
								/>
							</div>
						) : (
							<DeletedPost post={post} />
						)}
					</div>
				)
			})}
		</>
	)
}
