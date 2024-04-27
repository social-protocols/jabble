import { Link, useFetcher, useNavigate } from '@remix-run/react'
import moment from 'moment'
import { type FormEvent, useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { type Post } from '#app/db/types.ts'
import { type ScoredPost, type ScoredNote } from '#app/ranking.ts'
import { relativeEntropy } from '#app/utils/entropy.ts'
import { Direction } from '#app/vote.ts'
import { Card } from './card.tsx'
import { Truncate } from './Truncate.tsx'

/* Keep this relatively high, so people don't often have to click "read more"
   to read most content. But also not too high, so people don't have to
   scroll past big walls of text of posts they are not interested in */
const postTeaserMaxLines = 20
const noteMaxLines = 20

export function PostContent({
	content,
	maxLines,
	linkTo,
	deactivateLinks,
}: {
	content: string
	maxLines?: number
	deactivateLinks: boolean
	linkTo?: string
}) {
	const navigate = useNavigate()

	return (
		<div
			className="markdown"
			style={{ cursor: 'pointer' }}
			onClick={() => linkTo && navigate(linkTo)}
		>
			<Truncate lines={maxLines}>
				<Markdown deactivateLinks={deactivateLinks}>{content}</Markdown>
			</Truncate>
		</div>
	)
}

export function PostDetails({
	post,
	note,
	teaser,
	position,
	loggedIn,
}: {
	post: ScoredPost
	note: ScoredNote | null
	teaser: boolean
	position: Direction
	notePosition: Direction
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

	const handleReplySubmit = function (event: FormEvent<HTMLFormElement>) {
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
						noteId={note !== null ? note.id : null}
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
				{note && <NoteAttachment note={note} tag={post.tag} className="mt-2" />}

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

export function ParentPost({
	parentPost,
	tag,
}: {
	parentPost: Post
	tag: string
}) {
	return (
		<div className="threadline">
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
		</div>
	)
}

function ReplyForm({
	post,
	tag,
	className,
}: {
	post: ScoredPost
	tag: string
	className: string
}) {
	return (
		<div className={'flex flex-col items-end ' + className}>
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
	)
}

export function NoteAttachment({
	tag,
	note,
	className,
}: {
	note: ScoredNote
	tag: string
	className: string
}) {
	// TODO: what is a reasonable relativeEntropy cutoff? The algorithm now, using the simplified Bayesian algorithm calculation (to avoid MCMC or variational methods)
	// results in a different p and q even if there are no informed votes. So there will always be some relative entropy...

	const effectString =
		relativeEntropy(note.p, note.q) < 0.01
			? ''
			: (note.p > note.q ? '↑' : '↓') +
				Math.abs(Math.round((note.p - note.q) * 100)) +
				'%'
	return (
		<Link to={`/tags/${tag}/posts/${note.id}`}>
			<Card className={'bg-note pb-3 pt-2 text-note-foreground ' + className}>
				<div className="pb-1 text-sm font-medium opacity-50">
					Featured Reply <span>{effectString}</span>
					{/*<a href="/faq#noteEffect"> ⓘ</a>*/}
					{/*<span>Debug info: {relativeEntropy(note.p, note.q)} / {note.p} / {note.q} / {note.pCount}/{note.pSize} {note.qCount}/{note.qSize}</span>*/}
				</div>

				{note && (
					<PostContent
						content={note.content}
						maxLines={noteMaxLines}
						deactivateLinks={true}
					/>
				)}
			</Card>
		</Link>
	)
}

export function VoteButtons({
	tag,
	postId,
	noteId,
	state,
}: {
	tag: string
	postId: number
	noteId: number | null
	state: Direction
}) {
	return (
		<>
			<input type="hidden" name="postId" value={postId} />
			<input type="hidden" name="tag" value={tag} />
			<input type="hidden" name="state" value={Direction[state]} />

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
