import { Form } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { type ScoredPost } from '#app/ranking.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { ReplyForm } from './reply-form.tsx'

export function PostActionBar({
	post,
	loggedIn,
	isConvincing,
	needsVoteOnCriticalComment,
	voteHereIndicator,
}: {
	post: ScoredPost
	loggedIn: boolean
	isConvincing: boolean
	needsVoteOnCriticalComment: boolean
	voteHereIndicator: boolean
}) {
	const user = useOptionalUser()
	const isAdminUser: boolean = user ? Boolean(user.isAdmin) : false

	const [showReplyForm, setShowReplyForm] = useState(false)

	const ageString = moment(post.createdAt).fromNow()

	const handleReplySubmit = function () {
		setShowReplyForm(false)
	}

	return (
		<>
			<div className="mb-3 flex w-full text-sm">
				{post.deletedAt == null && loggedIn && (
					<button
						onClick={() => {
							setShowReplyForm(!showReplyForm)
							return false
						}}
						className="mr-2"
						style={{ visibility: loggedIn ? 'visible' : 'hidden' }}
					>
						🗨 Reply
					</button>
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
