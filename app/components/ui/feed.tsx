import { PostDetails, ParentPost } from '#app/components/ui/post.tsx'
import { type RankedPost } from '#app/ranking.ts'
import { Direction } from '#app/vote.ts'

export function Feed({
	posts,
	votes,
	rootId,
	loggedIn,
	showNotes,
}: {
	posts: RankedPost[]
	votes: Map<number, Direction>
	rootId: number | null
	loggedIn: boolean
	showNotes: boolean
}) {
	return (
		<>
			{posts.map((post, i) => {
				let vote = votes.get(post.id) || Direction.Neutral

				let followsParent = (i > 0 && posts[i - 1]!.id) == post.parentId
				let followedByTopnote =
					(i < posts.length - 1 && posts[i + 1]!.id) == post.topNoteId
				const directReply = rootId !== null && post.parentId == rootId


				let criticalThreadId = post.criticalThreadId;
				let isInformed = post.criticalThreadId == null ? true : ( votes.get(criticalThreadId!) || Direction.Neutral ) !== Direction.Neutral

				return (
					<div key={post.id} style={post.isCritical ? {borderLeft: "solid blue 3px"} : {}}>

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
							vote={vote}
							isInformed={isInformed}
							loggedIn={loggedIn}
						/>
					</div>
				)
			})}
		</>
	)
}
