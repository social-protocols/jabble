import { PostDetails, ParentPost } from '#app/components/ui/post.tsx'
import { type RankedPost } from '#app/ranking.ts'
import { type VoteState } from '#app/vote.ts'

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
	return (
		<>
			{posts.map((post, i) => {
				let vote = votes.get(post.id)!

				let followsParent = (i > 0 && posts[i - 1]!.id) == post.parentId
				let followedByTopnote =
					(i < posts.length - 1 && posts[i + 1]!.id) == post.topNoteId
				const directReply = rootId !== null && post.parentId == rootId

				const borderStyle = post.isCritical
					? vote.vote !== 0
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
								<ParentPost parentPost={post.parent!} tag={post.tag} />
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
