import { LocationType, type Location } from '#app/attention.ts'
import { PostDetails } from "#app/components/ui/post.tsx"
import { type Post } from '#app/db/types.ts'
import { type RankedPost } from '#app/ranking.ts'
import { Direction } from '#app/vote.ts'
// import { type PostId } from '#app/post.ts'

export function TagFeed({ tag, posts, positions }: {
  tag: string
  posts: RankedPost[]
  positions: Map<number, Direction>
}) {
  return (
    <div className='flex flex-column place-items-start'>
      <ul>
        {
          posts.map((post, i) => {

            let position = positions.get(post.id) || Direction.Neutral

            let randomLocation: Location | null = 
              post.random 
                ? {
                  oneBasedRank: i + 1,
                  locationType: LocationType.TagPage,
                } : null

            return (
              <li key={post.id}>
                <div className='flex-1 justify-self-center'>
                  <PostDetails post={post as Post} note={post.note} tag={tag} teaser={true} randomLocation={randomLocation} position={position} />
                </div>
              </li>

            )
          })
        }
      </ul>
    </div>
  );
}



