import { type Location, LocationType } from '#app/attention.ts'
import { PostDetails, ParentPost } from '#app/components/ui/post.tsx'
import { type RankedPost } from '#app/ranking.ts'
import { Direction } from '#app/vote.ts'
// import { type PostId } from '#app/post.ts'

export function TagFeed({
	tag,
	posts,
	positions,
}: {
	tag: string
	posts: RankedPost[]
	positions: Map<number, Direction>
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

				return (
					<div key={post.id}>
						{post.parent && <ParentPost parentPost={post.parent!} tag={tag} />}
						<PostDetails
							post={post}
							note={post.note}
							tag={tag}
							teaser={true}
							randomLocation={randomLocation}
							position={position}
							notePosition={notePosition}
						/>
					</div>
				)
			})}
		</>
	)
}
