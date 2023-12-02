import { type Post } from '#app/db/types.ts';

type PostProps = {
  post: Post,
  note: Post | null
}

export function PostDetails({ post, note }: PostProps) {
  const noteIsNull = note === null
  return (
    <div className='flex justify-center'>
      <div className="bg-primary rounded-lg p-5 m-5 text-primary-foreground w-full max-w-3xl">
        <p className="mb-5">{post.content}</p>
        {noteIsNull
          ? <div></div>
          : <div className="bg-secondary text-secondary-foreground p-5 mb-5 rounded-lg">{note ? note.content : ""}</div>}
      </div>
    </div>
  )
}
