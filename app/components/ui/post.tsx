import { Link, useFetcher } from '@remix-run/react'
import Markdown from 'markdown-to-jsx'
import { type Location, LocationType } from '#app/attention.ts'
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
		<Card className={'mb-5 flex flex-row space-x-4 bg-post'}>
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
						<Link to={`/tags/${tag}/posts/${post.id}`}>
							<Markdown>{post.content}</Markdown>
						</Link>
					) : (
						<span>
							<Markdown>{post.content}</Markdown>
						</span>
					)}
				</p>
				{note === null ? <></> : <NoteAttachment note={note} tag={tag} />}
			</div>
		</Card>
	)
}

export function NoteAttachment({ tag, note }: { note: Post; tag: string }) {
	return (
		<Link to={`/tags/${tag}/posts/${note.id}`}>
			<Card className={'bg-note text-note-foreground'}>
				<Markdown>{note ? note.content : ''}</Markdown>
			</Card>
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
