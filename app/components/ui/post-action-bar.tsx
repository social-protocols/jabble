import { Link, Form } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { type ScoredPost } from '#app/ranking.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Direction, type VoteState } from '#app/vote.ts'
import { CommentIcon } from './comment-icon.tsx'
import { ReplyForm } from './reply-form.tsx'

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
					>
						Reply
					</button>
				)}
				{isConvincing && (
					<span className="rounded bg-blue-100 px-1 italic text-blue-600">
						Convincing
					</span>
				)}
				{loggedIn && (
					<Link className="ml-2" to={`/post/${post.id}`}>
						<CommentIcon needsVote={needsVote} />
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
