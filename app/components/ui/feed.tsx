import { type Location, LocationType } from '#app/attention.ts'
import { PostDetails, ParentPost } from '#app/components/ui/post.tsx'
import { type RankedPost } from '#app/ranking.ts'
import { Direction } from '#app/vote.ts'
// import { type PostId } from '#app/post.ts'

export function Feed({
	posts,
	positions,
	loggedIn,
}: {
	posts: RankedPost[]
	positions: Map<number, Direction>
	loggedIn: boolean
}) {
	return (
		<>
			{posts.map((post, i) => {
				let position = positions.get(post.id) || Direction.Neutral
				let notePosition: Direction =
					(post.note && positions.get(post.note.id)) || Direction.Neutral

				let randomLocation: Location | null = post.random
					? {
							oneBasedRank: i + 1,
							locationType: LocationType.TagPage,
					  }
					: null

				let followsParent = (i > 0 && posts[i - 1]!.id) == post.parentId
				let followedByTopnote =
					(i < posts.length - 1 && posts[i + 1]!.id) == post.topNoteId
				return (
					<div key={post.id}>
						{post.parent &&
							(followsParent ? (
								<div className="link-to-parent threadline" />
							) : (
								<ParentPost parentPost={post.parent!} tag={post.tag} />
							))}
						<PostDetails
							post={post}
							note={!followedByTopnote ? post.note : null}
							teaser={true}
							randomLocation={randomLocation}
							position={position}
							notePosition={notePosition}
							loggedIn={loggedIn}
						/>
					</div>
				)
			})}
		</>
	)
}
