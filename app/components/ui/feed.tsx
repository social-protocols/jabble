import { PostTeaser } from "#app/components/ui/post.tsx"
import { type Post } from '#app/db/types.ts'

export function Feed({ posts }: Post[]) {
  return (
    <div className='flex w-10/12 max-w-3/5'>
      <ul>
        {posts.map((post) => (
          <li>
            <div className='flex-1'>
              <PostTeaser post={ post as Post} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


