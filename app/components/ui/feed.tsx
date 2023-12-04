import { PostDetails } from "#app/components/ui/post.tsx"
import { type Post } from '#app/db/types.ts'
import { type RankedPost } from '#app/ranking.ts'

type FeedProps = {
  posts: RankedPost[]
}

export function Feed({ posts }: FeedProps) {
  return (
    <div className='flex flex-column place-items-start'>
      <ul>
        {posts.map((post) => (
          <li>
            <div className='flex-1 justify-self-center'>
              <PostDetails post={post as Post} note={post.note} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

