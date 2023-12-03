import { type Post } from '#app/db/types.ts'
import { Button } from '#app/components/ui/button.tsx'
import { Link } from '@remix-run/react'

type PostProps = {
  post: Post,
  note: Post | null
}

export function PostDetails({ post, note }: PostProps) {
  return (
    <div className='flex justify-center'>
      <div className="bg-primary-foreground rounded-lg p-5 m-5 w-full max-w-3xl">
        <p className="mb-5">{post.content}</p>
        {
          note === null
            ? <div />
            : <NoteAttachment note={note} />
        }
        <VoteButtons />
      </div>
    </div>
  )
}

export function PostTeaser({ post }: Post) {
  return (
    <div className='justify-center'>
      <Link to={`/posts/${post.id}`}>
        <div className="bg-primary-foreground rounded-lg p-5 m-5">
          <p className="mb-5">{post.content}</p>
        </div>
      </Link>
    </div>
  )
}

export function NoteAttachment({ note }: { note: Post }) {
  return (
    <Link to={`/posts/${note.id}`}>
        <div className="bg-secondary p-5 mb-5 rounded-lg">
          {note ? note.content : ""}
        </div>
    </Link>
  )
}

export function VoteButtons() {
  return (
    <div>
      <Button variant='destructive' size='lg'>Upvote</Button>
      <Button variant='destructive' size='lg'>Downvote</Button>
    </div>
  )
}
