import { Button } from '#app/components/ui/button.tsx';
import { type Post } from '#app/db/types.ts';
import { Direction } from "#app/vote.ts";
import { Link, useFetcher, useActionData } from '@remix-run/react';
import { type Location, LocationType } from '#app/attention.ts';


export function PostDetails({ tag, post, note, teaser, randomLocation }: {
  tag: string,
  post: Post,
  note: Post | null,
  teaser: boolean,
  randomLocation: Location | null,
}) {
  return (
    <div className='flex justify-center'>
      <div className="bg-primary-foreground rounded-lg p-5 m-5 w-full max-w-3xl">
        <p className="mb-5">
          {teaser 
            ? <Link to={`/tags/${tag}/posts/${post.id}`}>{post.content}</Link>
            : <span>{post.content}</span>
          }
        </p>
        {
          note === null
            ? <span />
            : <NoteAttachment note={note} tag={tag} />
        }
        <div>
              <VoteButtons postId={post.id} tag={tag} noteId={note !== null ? note.id : null} randomLocation={randomLocation}/>
        </div>
        {
          teaser 
            ? <span />
            : 
            <div>
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

export function VoteButtons({ tag, postId, noteId, randomLocation}: { tag: string, postId: number, noteId: number | null, randomLocation: Location | null }) {

  const fetcher = useFetcher();

  const data = useActionData();

  let state = Direction.Neutral

  return (
    <fetcher.Form method="post" action="/vote">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="tag" value={tag} />
      <input type="hidden" name="state" value={Direction[state]} />

      {randomLocation === null ? <span/> : <span>
          <input type="hidden" name="randomLocationType" value={LocationType[randomLocation.locationType]} />
          <input type="hidden" name="oneBasedRank" value={randomLocation === null ? "" : randomLocation.oneBasedRank} />
        </span>
      }

      {noteId === null ? <span /> : <input type="hidden" name="noteId" value={noteId} />}

      <div>
        <Button className="upvote" name="direction" value="Up">▲</Button>
        <Button className="downvote" name="direction" value="Down">▼</Button>
      </div>

    </fetcher.Form>
  )
}


export function ReplyForm({ parentId, tag }: { parentId: number, tag: string }) {
  // const parentId = args.parentId;
  console.log("Parent id in replyFOrm is ", parentId)
  return (
    <form id="reply-form" method="post">
      <input type="hidden" value="reply" />
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
