import { Link, useFetcher, useNavigate, Form } from '@remix-run/react'
import moment from 'moment'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { type Post } from '#app/db/types.ts'
import { type ScoredPost } from '#app/ranking.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Direction, type VoteState, defaultVoteState } from '#app/vote.ts'
import { Truncate } from './Truncate.tsx'

/* Keep this relatively high, so people don't often have to click "read more"
   to read most content. But also not too high, so people don't have to
   scroll past big walls of text of posts they are not interested in */
const postTeaserMaxLines = 20

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
	teaser,
	voteState,
	loggedIn,
	onVote,
	isConvincing,
}: {
	post: ScoredPost
	teaser: boolean
	voteState?: VoteState
	loggedIn: boolean
	onVote?: Function
	isConvincing?: boolean
}) {
	// So we need to get the current state of the user's vote on this post from the fetcher
	const voteFetcher = useFetcher<{ voteState: VoteState; postId: number }>()

	const visibleVoteState = voteState || defaultVoteState(post.id)

	const handleVoteSubmit = function (event: FormEvent<HTMLFormElement>) {
		onVote && onVote()
		voteFetcher.submit(event.currentTarget) // this will work as the normal Form submit but you trigger it
	}

	const navigate = useNavigate()

	return (
		<div className={'flex w-full'}>
			<div className={'mr-2'} style={{ display: loggedIn ? 'block' : 'none' }}>
				<voteFetcher.Form
					method="POST"
					action="/vote"
					onSubmit={handleVoteSubmit}
				>
					<VoteButtons postId={post.id} vote={visibleVoteState} />
				</voteFetcher.Form>
			</div>
			<div
				className={
					'mb-3 flex min-w-0 flex-col space-y-1' + (teaser ? ' postteaser' : '')
				}
			>
				{post.deletedAt == null ? (
					<PostContent
						content={post.content}
						maxLines={teaser ? postTeaserMaxLines : undefined}
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
				) : (
					<div
						style={{ cursor: 'pointer' }}
						className={'italic text-gray-400'}
						onClick={() => `/post/${post.id}` && navigate(`/post/${post.id}`)}
					>
						This post was deleted.
					</div>
				)}
				<PostActionBar
					post={post}
					visibleVoteState={visibleVoteState}
					isConvincing={isConvincing || false}
					loggedIn={loggedIn}
				/>
			</div>
		</div>
	)
}

export function PostActionBar({
	post,
	visibleVoteState,
	loggedIn,
	isConvincing,
}: {
	post: ScoredPost
	visibleVoteState: VoteState
	loggedIn: boolean
	isConvincing: boolean
}) {
	const user = useOptionalUser()
	const isAdminUser: boolean = user ? Boolean(user.isAdmin) : false

	const [showReplyForm, setShowReplyForm] = useState(false)

	const ageString = moment(post.createdAt).fromNow()

	const handleReplySubmit = function () {
		setShowReplyForm(false)
	}

	const needsVote: boolean =
		!visibleVoteState.isInformed && visibleVoteState.vote !== Direction.Neutral

	return (
		<>
			<div className="mb-3 flex w-full space-x-2 text-sm">
				{post.deletedAt == null && loggedIn && (
					<button
						onClick={() => {
							setShowReplyForm(!showReplyForm)
							return false
						}}
						style={{ visibility: loggedIn ? 'visible' : 'hidden' }}
						// preventScrollReset={true}
					>
						🗨 Reply
					</button>
				)}
				{isConvincing ||
					(Math.random() > 0.5 && (
						<span className="rounded bg-blue-100 px-1 italic text-blue-600">
							Convincing
						</span>
					))}
				{loggedIn && (
					<Link className="ml-2" to={`/post/${post.id}`}>
						<NeedsVote needsVote={needsVote} />
					</Link>
				)}
				{post.deletedAt == null && isAdminUser && false && (
					<Form id="delete-post-form" method="POST" action="/deletePost">
						<input type="hidden" name="postId" value={post.id} />
						<input type="hidden" name="userId" value={user?.id} />
						<button className="rounded bg-red-400 px-1 text-white">
							delete
						</button>
					</Form>
				)}
				<span className="opacity-50">{ageString}</span>
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
				<Form
					id="reply-form"
					method="POST"
					action="/reply"
					onSubmit={handleReplySubmit}
				>
					<ReplyForm
						post={post}
						isPrivate={Boolean(post.isPrivate)}
						className="mt-2"
					/>
				</Form>
			)}
		</>
	)
}

export function ParentPost({ parentPost }: { parentPost: Post }) {
	return (
		<div className="threadline">
			<Link key={parentPost.id} to={`/post/${parentPost.id}`}>
				<div
					key={parentPost.id}
					className="postparent mb-1 ml-3 rounded-lg bg-post p-3 text-sm text-postparent-foreground"
				>
					{parentPost.deletedAt == null ? (
						<PostContent
							content={parentPost.content}
							maxLines={3}
							deactivateLinks={true}
						/>
					) : (
						<div className={'italic text-gray-400'}>This post was deleted.</div>
					)}
				</div>
			</Link>
		</div>
	)
}

function ReplyForm({
	post,
	isPrivate,
	className,
}: {
	post: ScoredPost
	isPrivate: boolean
	className: string
}) {
	return (
		<div className={'flex flex-col items-end ' + className}>
			<input type="hidden" name="parentId" value={post.id} />
			<input type="hidden" name="isPrivate" value={Number(isPrivate)} />

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

export function VoteButtons({
	postId,
	vote,
}: {
	postId: number
	vote: VoteState
}) {
	const upClass = vote.vote == Direction.Up ? '' : 'opacity-30'
	const downClass = vote.vote == Direction.Down ? '' : 'opacity-30'

	return (
		<>
			<input type="hidden" name="postId" value={postId} />
			<input type="hidden" name="state" value={Direction[vote.vote]} />

			<div className="flex flex-col text-xl">
				<button name="direction" value="Up" className={upClass}>
					▲
				</button>
				<button name="direction" value="Down" className={downClass}>
					▼
				</button>
			</div>
		</>
	)
}

export function NeedsVote({ needsVote }: { needsVote: boolean }) {
	const notificationIconCss: CSSProperties = {
		position: 'relative',
		display: 'inline-block',
		fontSize: '24px',
	}

	const speechBalloonCss: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
	}

	const blueDotCss: CSSProperties = {
		position: 'absolute',
		top: '4px',
		right: '4px',
		width: '12px',
		height: '12px',
		backgroundColor: 'blue',
		borderRadius: '50%',
		border: '2px solid white',
		transform: 'translate(50%, -50%)',
	}

	return (
		<>
			<div className="rounded-sm bg-yellow-100 px-1 italic text-yellow-900">
				Critical comment needs your vote
			</div>
		</>
	)
}
