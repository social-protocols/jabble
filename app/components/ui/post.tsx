import { Link, useFetcher } from '@remix-run/react'
import { type Location, LocationType } from '#app/attention.ts'
import { Button } from '#app/components/ui/button.tsx'
import { type Post } from '#app/db/types.ts'
import { Direction } from '#app/vote.ts'
import { Card } from './card.tsx'

export function PostDetails({
	tag,
	post,
	note,
	teaser,
	randomLocation,
	position,
	notePosition,
}: {
	tag: string
	post: Post
	note: Post | null
	teaser: boolean
	randomLocation: Location | null
	position: Direction
	notePosition: Direction
}) {
	// The vote buttons use the fetcher and shouldRevalidate to do a post without reloading the page.
	// So we need to get the current state of the user's vote on this post from the fetcher
	const fetcher = useFetcher<{ state: Direction; postId: number }>()
	let voteState =
		fetcher.data && fetcher.data.postId === post.id
			? fetcher.data.state
			: position

	return (
		<Card className={'my-5 flex flex-row space-x-4'}>
			<div>
				<fetcher.Form method="post" action="/vote">
					<VoteButtons
						postId={post.id}
						tag={tag}
						noteId={note !== null ? note.id : null}
						randomLocation={randomLocation}
						state={voteState}
					/>
				</fetcher.Form>
			</div>
			<div className={'flex flex-col space-y-4'}>
				<p>
					{teaser ? (
						<Link to={`/tags/${tag}/posts/${post.id}`}>{post.content}</Link>
					) : (
						<span>{post.content}</span>
					)}
				</p>
				{note === null ? <></> : <NoteAttachment note={note} tag={tag} />}
				{teaser ? <span /> : <ReplyForm parentId={post.id} tag={tag} />}
			</div>
		</Card>
	)
}

export function NoteAttachment({ tag, note }: { note: Post; tag: string }) {
	return (
		<Link to={`/tags/${tag}/posts/${note.id}`}>
			<Card className={'bg-secondary'}>{note ? note.content : ''}</Card>
		</Link>
	)
}

export function VoteButtons({
	tag,
	postId,
	noteId,
	randomLocation,
	state,
}: {
	tag: string
	postId: number
	noteId: number | null
	randomLocation: Location | null
	state: Direction
}) {
	return (
		<>
			<input type="hidden" name="postId" value={postId} />
			<input type="hidden" name="tag" value={tag} />
			<input type="hidden" name="state" value={Direction[state]} />

			{randomLocation === null ? (
				<></>
			) : (
				<>
					<input
						type="hidden"
						name="randomLocationType"
						value={LocationType[randomLocation.locationType]}
					/>
					<input
						type="hidden"
						name="oneBasedRank"
						value={randomLocation === null ? '' : randomLocation.oneBasedRank}
					/>
				</>
			)}

			{noteId === null ? (
				<></>
			) : (
				<input type="hidden" name="noteId" value={noteId} />
			)}

			<div className="flex flex-col text-xl">
				<button
					name="direction"
					value="Up"
					className={state === Direction.Up ? '' : 'opacity-30'}
				>
					▲
				</button>
				<button
					name="direction"
					value="Down"
					className={state === Direction.Down ? '' : 'opacity-30'}
				>
					▼
				</button>
			</div>
		</>
	)
}

export function ReplyForm({
	parentId,
	tag,
}: {
	parentId: number
	tag: string
}) {
	console.log('Parent id in replyFOrm is ', parentId)
	return (
		<form id="reply-form" method="post">
			<input type="hidden" value="reply" />
			<div className="flex w-full">
				<input type="hidden" name="parentId" value={parentId} />
				<input type="hidden" name="tag" value={tag} />

				<div className="mr-1">
					<textarea
						name="content"
						className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
						cols={100}
						rows={1}
						placeholder="Enter your reply"
					></textarea>
				</div>
				<div className="justify-end">
					<button className="float-right rounded bg-blue-500 px-4 py-2 text-base font-bold text-white hover:bg-blue-700">
						Reply
					</button>
				</div>
			</div>
		</form>
	)
}
