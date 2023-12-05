import { Button } from '#app/components/ui/button.tsx';
import { type Post } from '#app/db/types.ts';
import { Link } from '@remix-run/react';


type PostProps = {
  tag: string,
  post: Post,
  note: Post | null,
  teaser: boolean,
}

export function PostDetails({ tag, post, note, teaser }: PostProps) {
  return (
    <div className='flex justify-center'>
      <div className="bg-primary-foreground rounded-lg p-5 m-5 w-full max-w-3xl">
        <p className="mb-5">{post.content}</p>
        {
          note === null
            ? <div />
            : <NoteAttachment note={note} tag={tag} />
        }
        {
          teaser 
            ? <div />
            : 
            <div>
              <VoteButtons />
              <ReplyForm parentId={post.id} tag={tag} />
            </div>
        }
      </div>
    </div>
  )
}

// type PostTeaserProps = {
//   post: Post
//   tag: string
// }

// export function PostTeaser({ tag, post }: PostTeaserProps) {
//   return (
//     <div className='justify-center'>
//       <Link to={`/tags/${tag}/posts/${post.id}`}>
//         <div className="bg-primary-foreground rounded-lg p-5 m-5">
//           <p className="mb-5">{post.content}</p>
//         </div>
//       </Link>
//     </div>
//   )
// }

type NoteAttachmentProps = {
  note: Post
  tag: string
}

export function NoteAttachment({ tag, note }: NoteAttachmentProps) {
  return (
    <Link to={`/tags/${tag}/posts/${note.id}`}>
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


export function ReplyForm({ parentId, tag }: { parentId: number, tag: string }) {
  // const parentId = args.parentId;
  console.log("Parent id in replyFOrm is ", parentId)
  return (
    <form id="reply-form" method="post">
      <div className="w-full flex">
        <input type="hidden" name="parentId" value={parentId} />
        <input type="hidden" name="tag" value={tag} />

        <div className="mr-1">
          <textarea name="content"
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            cols={100}
            rows={1}
            placeholder="Enter your reply">
          </textarea>
        </div>
        <div className="justify-end">
          <button className="bg-blue-500 hover:bg-blue-700 text-base text-white font-bold py-2 px-4 rounded float-right">
            Reply
          </button>
        </div>
      </div>
    </form >
  )
}
