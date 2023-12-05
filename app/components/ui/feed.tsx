import { PostDetails } from "#app/components/ui/post.tsx"
import { type Post } from '#app/db/types.ts'
import { type RankedPost } from '#app/ranking.ts'

type FeedProps = {
  tag: string
  posts: RankedPost[]
}

export function Feed({tag, posts }: FeedProps) {
  return (
    <div className='flex flex-column place-items-start'>
      <ul>
        {posts.map((post) => (
          <li>
            <div className='flex-1 justify-self-center'>
              <PostDetails post={post as Post} note={post.note} tag={tag} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

