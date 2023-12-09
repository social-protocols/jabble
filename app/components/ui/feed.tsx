import { PostDetails } from "#app/components/ui/post.tsx"
import { type Post } from '#app/db/types.ts'
import { type RankedPost } from '#app/ranking.ts'
import { type Location, LocationType } from '#app/attention.ts'

export function Feed({ tag, posts }: {
  tag: string
  posts: RankedPost[]
}) {
  return (
    <div className='flex flex-column place-items-start'>
      <ul>
        {
            posts.map((post, i) => {

              let randomLocation: Location | null = 
                post.random 
                ? {
                  oneBasedRank: i + 1,
                  locationType: LocationType.TagPage,
                } : null

                return (
                <li key={post.id}>
                  <div className='flex-1 justify-self-center'>
                    <PostDetails post={post as Post} note={post.note} tag={tag} teaser={true} randomLocation={randomLocation} />
                  </div>
                </li>

                )
            })
        }
      </ul>
    </div>
  );
}

