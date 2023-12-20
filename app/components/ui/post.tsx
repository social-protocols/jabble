import { Link, useFetcher } from '@remix-run/react'
import Markdown from 'markdown-to-jsx'
import moment from 'moment'
import { type FormEvent, useState } from 'react'
import { type Location, LocationType } from '#app/attention.ts'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { type Post } from '#app/db/types.ts'
import { type ScoredPost } from '#app/ranking.ts'
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
	post: ScoredPost
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

	const [showReplyForm, setShowReplyForm] = useState(false)

	const replyFetcher = useFetcher<{ newPostId: number }>()

	if (replyFetcher.data) {
		console.log('Fetcher data', replyFetcher.data)
	}

	const nReplies = post.nReplies
	// const nRepliesString =
	// 	nReplies === 1 ? '1 Reply' : (nReplies === 0 ? 'No' : nReplies) + ' Replies'

	const nRepliesString =
		nReplies === 1 ? '1 reply' : nReplies > 1 ? nReplies + ' replies' : ''

	const handleReplySubmit = function(event: FormEvent<HTMLFormElement>) {
		event.preventDefault() // this will prevent Remix from submitting the form
		setShowReplyForm(false)
		replyFetcher.submit(event.currentTarget) // this will work as the normal Form submit but you trigger it
	}

	let informationRateString = Math.round(post.informationRate * 100) / 100
	const ageString = moment(post.createdAt).fromNow()

	return (
		<Card className={'mb-5 flex w-full flex-row space-x-4 bg-post'}>
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
				<Markdown className="markdown">{post.content}</Markdown>
				{note === null ? <></> : <NoteAttachment note={note} tag={tag} />}

				<div className="post-stats mb-4 flex w-full text-sm">
					<Link
						to={`/tags/${tag}/stats/${post.id}`}
						className="information-rate green-400 pr-2 font-medium"
					>
						{informationRateString} bits
					</Link>

					{teaser ? (
						<Link
							to={`/tags/${tag}/posts/${post.id}`}
							className="age pr-2 underline"
						>
							{ageString}
						</Link>
					) : (
						<>{ageString}</>
					)}

					{teaser && (
						<Link to={`/tags/${tag}/posts/${post.id}`} className="underline">
							{nRepliesString}
						</Link>
					)}
					<button
						className="hyperlink ml-2"
						onClick={() => {
							setShowReplyForm(!showReplyForm)
							return false
						}}
					// preventScrollReset={true}
					>
						reply
					</button>
					{showReplyForm ? (
						<button
							className="ml-auto pr-2"
							onClick={() => setShowReplyForm(false)}
						>
							✕
						</button>
					) : (
						<></>
					)}
				</div>
				{showReplyForm && (
					<replyFetcher.Form
						id="reply-form"
						method="post"
						action="/reply"
						onSubmit={handleReplySubmit}
					>
						<div className="flex flex-col items-end">
							<input type="hidden" name="parentId" value={post.id} />
							<input type="hidden" name="tag" value={tag} />

							<Textarea
								name="content"
								className="mb-2 w-full"
								style={{
									resize: 'vertical',
								}}
								autoFocus={true}
								placeholder="Enter your reply"
							/>

							<div>
								<button className="rounded bg-blue-500 px-4 py-2 text-base font-bold text-white hover:bg-blue-700">
									Reply
								</button>
							</div>
						</div>
					</replyFetcher.Form>
				)}
			</div>
		</Card>
	)
}

export function NoteAttachment({ tag, note }: { note: Post; tag: string }) {
	return (
		<Link to={`/tags/${tag}/posts/${note.id}`}>
			<Card className={'bg-note pb-3 pt-2 text-note-foreground'}>
				<div className="pb-1 text-sm font-medium opacity-50">Top Reply</div>
				<Markdown className="markdown">{note ? note.content : ''}</Markdown>
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
