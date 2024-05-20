import { Link, useFetcher, useNavigate, Form } from '@remix-run/react'
import moment from 'moment'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { type Post } from '#app/db/types.ts'
import { type ScoredPost, type ScoredNote } from '#app/ranking.ts'
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
	note,
	teaser,
	voteState,
	loggedIn,
	onVote,
	isConvincing,
}: {
	post: ScoredPost
	note: ScoredNote | null
	teaser: boolean
	voteState?: VoteState
	loggedIn: boolean
	onVote?: Function
	isConvincing?: boolean
}) {
	// So we need to get the current state of the user's vote on this post from the fetcher
	const voteFetcher = useFetcher<{ voteState: VoteState; postId: number }>()

	const [showReplyForm, setShowReplyForm] = useState(false)

	const ageString = moment(post.createdAt).fromNow()

	const handleReplySubmit = function () {
		setShowReplyForm(false)
	}

	const visibleVoteState = voteFetcher.data
		? voteFetcher.data.voteState
		: voteState || defaultVoteState(post.id)

	const needsVote: boolean =
		!visibleVoteState.isInformed && visibleVoteState.vote !== Direction.Neutral

	const handleVoteSubmit = function (event: FormEvent<HTMLFormElement>) {
		onVote && onVote()
		voteFetcher.submit(event.currentTarget) // this will work as the normal Form submit but you trigger it
	}
	
	const navigate = useNavigate()

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
				<voteFetcher.Form
					method="POST"
					action="/vote"
					onSubmit={handleVoteSubmit}
				>
					<VoteButtons
						postId={post.id}
						tag={post.tag}
						noteId={note !== null ? note.id : null}
						vote={visibleVoteState}
						pCurrent={post.p}
					/>
				</voteFetcher.Form>
			</div>
			<div
				className={
					'flex w-full min-w-0 flex-col' + (teaser ? ' postteaser' : '')
				}
			>
				<div className="mb-1 mt-2 flex text-sm">
					{isConvincing && (
						<span className="rounded bg-blue-100 px-1 italic text-blue-600">
							Convincing
						</span>
					)}
					<span className="ml-auto opacity-50">{ageString}</span>
				</div>

				{post.deletedAt == null ? (
					<PostContent
						content={post.content}
						maxLines={teaser ? postTeaserMaxLines : undefined}
						deactivateLinks={false}
						linkTo={`/tags/${post.tag}/posts/${post.id}`}
					/>) : (
						<div
							style={{ cursor: 'pointer' }}
							className={'italic text-gray-400'}
							onClick={() => `/tags/${post.tag}/posts/${post.id}` && navigate(`/tags/${post.tag}/posts/${post.id}`)}
						>
							This post was deleted.
						</div>
					)
				}

				<div className="mt-2 flex w-full text-sm">
					<Link to={`/tags/${post.tag}/posts/${post.id}`} className="ml-2">
						<CommentIcon needsVote={needsVote} nReplies={post.nReplies} />
					</Link>
					{post.deletedAt == null && (
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
					)}
					{post.deletedAt == null && (
						<Form
							id='delete-post-form'
							method='POST'
							action='/deletePost'
						>
							<input type='hidden' name='postId' value={post.id} />
							<input type='hidden' name='tag' value={post.tag} />
							<button className='ml-2'>delete</button>
						</Form>
					)}
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
						<ReplyForm post={post} tag={post.tag} className="mt-2" />
					</Form>
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

export function VoteButtons({
	tag,
	postId,
	noteId,
	vote,
	pCurrent,
}: {
	tag: string
	postId: number
	noteId: number | null
	vote: VoteState
	pCurrent: number
}) {
	const upClass = vote.vote == Direction.Up ? '' : 'opacity-30'
	const downClass = vote.vote == Direction.Down ? '' : 'opacity-30'

	const pCurrentString: String = (pCurrent * 100).toFixed(0) + '%'

	return (
		<>
			<input type="hidden" name="postId" value={postId} />
			<input type="hidden" name="tag" value={tag} />
			<input type="hidden" name="state" value={Direction[vote.vote]} />

			{noteId === null ? (
				<></>
			) : (
				<input type="hidden" name="noteId" value={noteId} />
			)}

			<div className="flex flex-col text-xl">
				<button name="direction" value="Up" className={upClass}>
					▲
				</button>
				<Link to={`/tags/${tag}/stats/${postId}`} className="hyperlink">
					<div className="text-xs">{pCurrentString}</div>
				</Link>
				<button name="direction" value="Down" className={downClass}>
					▼
				</button>
			</div>
		</>
	)
}

export function CommentIcon({
	needsVote,
	nReplies,
}: {
	needsVote: boolean
	nReplies: number
}) {
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
			<div style={notificationIconCss}>
				{needsVote && <div style={blueDotCss}></div>}
				<div style={speechBalloonCss} className="text-sm">
					💬
				</div>
			</div>
			&nbsp;{nReplies}
		</>
	)
}
