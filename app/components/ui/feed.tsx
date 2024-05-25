import { PostDetails, ParentPost } from '#app/components/ui/post.tsx'
import { type RankedPost } from '#app/ranking.ts'
import { type VoteState, Direction, defaultVoteState } from '#app/vote.ts'

export function Feed({
	posts,
	votes,
	rootId,
	loggedIn,
	showNotes,
}: {
	posts: RankedPost[]
	votes: Map<number, VoteState>
	rootId: number | null
	loggedIn: boolean
	showNotes: boolean
}) {
	const legacyTag = 'global'

	return (
		<>
			{posts.map((post, i) => {
				let vote: VoteState = votes.get(post.id) || defaultVoteState(post.id)

				let followsParent = posts[i - 1]?.id == post.parentId
				let followedByTopnote = posts[i + 1]?.id == post.topNoteId
				const directReply = rootId !== null && post.parentId == rootId

				const borderStyle = post.isCritical
					? vote.vote !== Direction.Neutral
						? { borderLeft: 'solid grey 3px' }
						: { borderLeft: 'solid blue 3px' }
					: {}

				return (
					<div key={post.id} style={borderStyle}>
						{!directReply &&
							post.parent !== null &&
							(followsParent ? (
								<div className="link-to-parent threadline" />
							) : (
								<ParentPost parentPost={post.parent} tag={legacyTag} />
							))}
						<PostDetails
							post={post}
							note={showNotes && !followedByTopnote ? post.note : null}
							teaser={true}
							voteState={vote}
							loggedIn={loggedIn}
						/>
					</div>
				)
			})}
		</>
	)
}
