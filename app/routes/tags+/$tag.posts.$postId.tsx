import {
  type ActionFunctionArgs,
  type DataFunctionArgs,
  json,
} from '@remix-run/node'

import {
  Link,
  type ShouldRevalidateFunction,
  useLoaderData,
  useFetcher,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

import { logPostPageView } from '#app/attention.ts'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { PostContent, PostDetails, VoteButtons } from '#app/components/ui/post.tsx'
import { type Post } from '#app/db/types.ts'

import { getUserPositions } from '#app/positions.ts'
import { createPost, getTransitiveParents } from '#app/post.ts'
import {
  getRankedReplies,
  getTopNote,
  getScoredPost,
  type RankedPost,
  type ScoredPost,
  type ScoredNote,
} from '#app/ranking.ts'
import { getUserId, requireUserId } from '#app/utils/auth.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'

import { Direction } from '#app/vote.ts'
import { FormEvent, useState } from 'react'
import moment from 'moment'

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()
const contentSchema = z.coerce.string()

export async function loader({ params, request }: DataFunctionArgs) {
  invariant(params.postId, 'Missing postid param')
  invariant(params.tag, 'Missing tag param')
  const postId: number = postIdSchema.parse(params.postId)
  const tag: string = tagSchema.parse(params.tag)

  const userId: string | null = await getUserId(request)
  const post: ScoredPost = await getScoredPost(tag, postId)

  invariantResponse(post, 'Post not found', { status: 404 })

  const transitiveParents = await getTransitiveParents(post.id)

  let replies: RankedPost[] = (await getRankedReplies(tag, post.id)).posts

  // Get the top note, which may be selected randomly
  let topNote: ScoredNote | null = await getTopNote(tag, post)

  await logPostPageView(tag, post.id, userId, topNote?.id || null)

  // let positions: Map<number, Direction> = new Map<number, Direction>()
  let positions =
    userId === null
      ? []
      : await getUserPositions(
        userId,
        tag,
        replies.map(p => p.id).concat([post.id]),
      )

  const loggedIn = userId !== null

  let result = json({
    post,
    transitiveParents,
    replies,
    tag,
    positions,
    topNote,
    loggedIn,
  })

  return result
}

const replySchema = zfd.formData({
  parentId: postIdSchema,
  tag: tagSchema,
  content: contentSchema,
})

export default function Post() {
  const {
    post,
    transitiveParents,
    replies,
    tag,
    positions,
    loggedIn,
  } = useLoaderData<typeof loader>()

  let p = new Map<number, Direction>()
  for (let position of positions) {
    p.set(position.postId, position.vote)
  }

  let position = p.get(post.id) || Direction.Neutral

  return (
    <>
      <div className="mb-5">
        <Link to={`/`}>Home</Link>
        &nbsp; &gt; <Link to={`/tags/${tag}`}>#{tag}</Link>
      </div>
      <ParentThread transitiveParents={transitiveParents} tag={tag} />
      <FocusedPostDetails
        post={post}
        position={position}
        loggedIn={loggedIn}
      />
      [ Critical Thread ]
      <PostReplies replies={replies} positions={p} loggedIn={loggedIn} />
    </>
  )
}


export function FocusedPostDetails({
  post,
  position,
  loggedIn,
}: {
  post: ScoredPost
  position: Direction
  loggedIn: boolean
}) {
  // The vote buttons use the fetcher and shouldRevalidate to do a post without reloading the page.
  // So we need to get the current state of the user's vote on this post from the fetcher
  const fetcher = useFetcher<{ state: Direction; postId: number }>()
  let voteState =
    fetcher.data && fetcher.data.postId === post.id
      ? fetcher.data.state
      : position

  const nRepliesString =
    post.nReplies === 1 ? '1 reply' : `${post.nReplies} replies`

  const [showReplyForm, setShowReplyForm] = useState(false)

  let informedProbabilityString = Math.round(post.p * 100)
  const ageString = moment(post.createdAt).fromNow()

  const replyFetcher = useFetcher<{ newPostId: number }>()

  if (replyFetcher.data) {
    console.log('Fetcher data', replyFetcher.data)
  }

  const handleReplySubmit = function(event: FormEvent<HTMLFormElement>) {
    replyFetcher.submit(event.currentTarget) // this will work as the normal Form submit but you trigger it
    setShowReplyForm(false)
  }

  return (
    <div
      className={
        'mb-5 flex w-full flex-row space-x-4 rounded-lg bg-post px-5 pb-5'
      }
    >
      <div
        className="mt-5"
        style={{ visibility: loggedIn ? 'visible' : 'hidden' }}
      >
        <fetcher.Form method="post" action="/vote">
          <VoteButtons
            postId={post.id}
            tag={post.tag}
            noteId={null}
            randomLocation={randomLocation}
            state={voteState}
          />
        </fetcher.Form>
      </div>
      <div
        className={
          'flex w-full min-w-0 flex-col' + (teaser ? ' postteaser' : '')
        }
      >
        <div className="mt-1 text-right text-sm opacity-50">{ageString}</div>

        <PostContent
          content={post.content}
          maxLines={teaser ? postTeaserMaxLines : undefined}
          deactivateLinks={false}
          linkTo={`/tags/${post.tag}/posts/${post.id}`}
        />

        <div className="mt-2 flex w-full text-sm">
          <Link to={`/tags/${post.tag}/stats/${post.id}`} className="hyperlink">
            {informedProbabilityString}%
          </Link>
          <Link
            to={`/tags/${post.tag}/posts/${post.id}`}
            className="hyperlink ml-2"
          >
            {nRepliesString}
          </Link>
          <button
            className="hyperlink ml-2"
            onClick={() => {
              setShowReplyForm(!showReplyForm)
              return false
            }}
            style={{ visibility: loggedIn ? 'visible' : 'hidden' }}
          // preventScrollReset={true}
          >
            reply
          </button>
          {showReplyForm && (
            <button
              className="ml-auto pr-2"
              onClick={() => setShowReplyForm(false)}
            >
              ✕
            </button>
          )}
        </div>
        {showReplyForm && (
          <replyFetcher.Form
            id="reply-form"
            method="POST"
            action="/reply"
            onSubmit={handleReplySubmit}
          >
            <ReplyForm post={post} tag={post.tag} className="mt-2" />
          </replyFetcher.Form>
        )}
      </div>
    </div>
  )
}

function ParentThread({
  transitiveParents,
  tag,
}: {
  transitiveParents: Post[]
  tag: string
}) {
  return (
    <div className="threadline">
      {transitiveParents.map(parentPost => (
        <Link key={parentPost.id} to={`/tags/${tag}/posts/${parentPost.id}`}>
          <div
            key={parentPost.id}
            className="postparent mb-1 ml-3 rounded-lg bg-post p-3 text-sm text-postparent-foreground"
          >
            <PostContent
              content={parentPost.content}
              maxLines={3}
              deactivateLinks={true}
            />
          </div>
        </Link>
      ))}
    </div>
  )
}

export function PostReplies({
  replies,
  positions,
  loggedIn,
}: {
  replies: RankedPost[]
  positions: Map<number, Direction>
  loggedIn: boolean
}) {
  const nRepliesString =
    replies.length === 1 ? '1 reply' : `${replies.length} replies`

  return (
    <>
      <h2 className="mb-4 font-medium">{nRepliesString}</h2>
      {replies.length > 0 && (
        <ol>
          {replies.map((post: RankedPost) => {
            // let randomLocation = {locationType: LocationType.PostReplies, oneBasedRank: i + 1}

            let position: Direction =
              positions.get(post.id) || Direction.Neutral

            return (
              <li key={post.id}>
                <PostDetails
                  post={post}
                  note={post.note}
                  teaser={true}
                  randomLocation={null}
                  position={position}
                  notePosition={Direction.Neutral}
                  loggedIn={loggedIn}
                />
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}

export function ErrorBoundary() {
  return (
    <GeneralErrorBoundary
      statusHandlers={{
        // 404: ({ params }) => <p>Post not found</p>,
        404: () => <p>Post not found</p>,
      }}
    />
  )
}

export const shouldRevalidate: ShouldRevalidateFunction = (args: {
  formAction?: string | undefined
}) => {
  // Optimization that makes it so /votes don't reload the page
  if (args.formAction == '/vote') {
    return false
  }
  return true
}
