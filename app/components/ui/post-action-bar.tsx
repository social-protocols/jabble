import { Form } from '@remix-run/react'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import {
	type ImmutableReplyTree,
	type ReplyTree,
	toImmutableReplyTree,
	type CommentTreeState,
	type ScoredPost,
} from '#app/ranking.ts'
import { useOptionalUser } from '#app/utils/user.ts'

export function PostActionBar({
	post,
	focussedPostId,
	loggedIn,
	setPostDataState,
	onReplySubmit,
}: {
	post: ScoredPost
	focussedPostId: number
	loggedIn: boolean
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
	onReplySubmit: (reply: ImmutableReplyTree) => void
}) {
	const user = useOptionalUser()
	const isAdminUser: boolean = user ? Boolean(user.isAdmin) : false

	const [showReplyForm, setShowReplyForm] = useState(false)

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
				{isAdminUser &&
					(post.deletedAt == null ? (
						<Form id="delete-post-form" method="POST" action="/deletePost">
							<input type="hidden" name="postId" value={post.id} />
							<input type="hidden" name="userId" value={user?.id} />
							<button className="rounded bg-red-400 px-1 text-white">
								delete
							</button>
						</Form>
					) : (
						<Form id="restore-post-form" method="POST" action="/restorePost">
							<input type="hidden" name="postId" value={post.id} />
							<input type="hidden" name="userId" value={user?.id} />
							<button className="rounded bg-green-500 px-1 text-white">
								restore
							</button>
						</Form>
					))}
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
				<ReplyForm
					post={post}
					setShowReplyForm={setShowReplyForm}
					focussedPostId={focussedPostId}
					setPostDataState={setPostDataState}
					onReplySubmit={onReplySubmit}
				/>
			)}
		</>
	)
}

function ReplyForm({
	post,
	setShowReplyForm,
	focussedPostId,
	setPostDataState,
	onReplySubmit,
}: {
	post: ScoredPost
	setShowReplyForm: Dispatch<SetStateAction<boolean>>
	focussedPostId: number
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
	onReplySubmit: (reply: ImmutableReplyTree) => void
}) {
	const [contentState, setContentState] = useState<string>('')

	const handleReplySubmit = async function () {
		setShowReplyForm(false)
		const payload = {
			parentId: post.id,
			focussedPostId: focussedPostId,
			content: contentState,
			isPrivate: post.isPrivate,
		}
		const response = await fetch('/reply', {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		const responseDecoded = (await response.json()) as {
			commentTreeState: CommentTreeState
			newReplyTree: ReplyTree
		}
		setPostDataState && setPostDataState(responseDecoded.commentTreeState)
		onReplySubmit && onReplySubmit(toImmutableReplyTree(responseDecoded.newReplyTree))
	}

	return (
		<div className="flex flex-col items-end">
			<Textarea
				name="content"
				className="mb-2 w-full"
				style={{
					resize: 'vertical',
				}}
				autoFocus={true}
				placeholder="Enter your reply"
				onChange={event => setContentState(event.currentTarget.value)}
			/>
			<button
				className="rounded bg-blue-500 px-4 py-2 text-base font-bold text-white hover:bg-blue-700"
				onClick={handleReplySubmit}
			>
				Reply
			</button>
		</div>
	)
}
