import { PostTeaser } from "#app/components/ui/post.tsx"
import { type Post } from '#app/db/types.ts'

export function Feed({ posts }: Post[]) {
  return (
    <ul>
      {posts.map((post) => (
        <li>
          <PostTeaser post={ post as Post} />
        </li>
      ))}
    </ul>
  );
}


