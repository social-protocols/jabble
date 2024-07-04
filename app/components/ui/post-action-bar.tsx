import { Link } from '@remix-run/react'
import { type Dispatch, type SetStateAction, useRef, useState } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { toImmutableReplyTree } from '#app/repositories/ranking.ts'
import {
	type ImmutableReplyTree,
	type Post,
	type ReplyTree,
	type CommentTreeState,
	type PostState,
	type CollapsedState,
} from '#app/types/api-types.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Icon } from './icon.tsx'

export function PostActionBar({
	post,
	postState,
	hasUninformedVote,
	focussedPostId,
	loggedIn,
	isDeleted,
	setCommentTreeState,
	onReplySubmit,
	pathFromFocussedPost,
	isCollapsedState,
	onCollapseParentSiblings,
}: {
	post: Post
	postState: PostState
	hasUninformedVote: boolean
	focussedPostId: number
	loggedIn: boolean
	isDeleted: boolean
	setCommentTreeState: Dispatch<SetStateAction<CommentTreeState>>
	onReplySubmit: (reply: ImmutableReplyTree) => void
	pathFromFocussedPost: Immutable.List<number>
	isCollapsedState: CollapsedState
	onCollapseParentSiblings: (
		pathFromFocussedPost: Immutable.List<number>,
	) => void
}) {
	const user = useOptionalUser()
	const isAdminUser: boolean = user ? Boolean(user.isAdmin) : false

	const [showReplyForm, setShowReplyForm] = useState(false)

	async function handleSetDeletedAt(deletedAt: number | null) {
		const payload = {
			postId: post.id,
			focussedPostId: focussedPostId,
			deletedAt: deletedAt,
		}
		const response = await fetch('/setDeletedAt', {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		const newCommentTreeState = (await response.json()) as CommentTreeState
		setCommentTreeState(newCommentTreeState)
	}

	async function handleSetDiscussionOfTheDay() {
		const payload = {
			postId: post.id,
		}
		await fetch('/promoteDiscussionOfTheDay', {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json',
			},
		})
	}

	const myRef = useRef<HTMLDivElement>(null)
	const scrollIntoView = () => {
		if (myRef.current) {
			myRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}

	return (
		<>
			<div className="mt-auto flex w-full pt-1 text-sm">
				{hasUninformedVote ? (
					<Link
						title="Jump to comment labeled 'Vote here'"
						to={`/post/${focussedPostId}/#post-${postState.criticalCommentId}`}
					>
						<Icon className="mr-2 text-blue-500" name="double-arrow-down" />
					</Link>
				) : (
					''
				)}
				{!isDeleted && loggedIn && (
					<button
						onClick={() => {
							setShowReplyForm(!showReplyForm)
							return false
						}}
						className="mr-2"
						style={{ visibility: loggedIn ? 'visible' : 'hidden' }}
					>
						<Icon name="chat-bubble" /> Reply
					</button>
				)}
				<button
					title="Collapse unrelated comments"
					className="my-[-2px] text-[30px] sm:text-base"
					onClick={() => {
						onCollapseParentSiblings(pathFromFocussedPost)
						scrollIntoView()
					}}
				>
					<Icon name="target" /> Focus
				</button>
				{isAdminUser &&
					(!isDeleted ? (
						<button
							className="mr-2"
							onClick={() => handleSetDeletedAt(Date.now())}
						>
							<Icon name="trash" /> Delete
						</button>
					) : (
						<button className="mr-2" onClick={() => handleSetDeletedAt(null)}>
							<Icon name="counter-clockwise-clock" /> Restore
						</button>
					))}
				{isAdminUser && (
					<button
						className="mr-2"
						title="Promote the root post of this discussion to discussion of the day"
						onClick={handleSetDiscussionOfTheDay}
					>
						<Icon name="double-arrow-up" /> Promote
					</button>
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
				<ReplyForm
					post={post}
					setShowReplyForm={setShowReplyForm}
					focussedPostId={focussedPostId}
					setCommentTreeState={setCommentTreeState}
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
	setCommentTreeState,
	onReplySubmit,
}: {
	post: Post
	setShowReplyForm: Dispatch<SetStateAction<boolean>>
	focussedPostId: number
	setCommentTreeState: Dispatch<SetStateAction<CommentTreeState>>
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
		setCommentTreeState && setCommentTreeState(responseDecoded.commentTreeState)
		onReplySubmit &&
			onReplySubmit(toImmutableReplyTree(responseDecoded.newReplyTree))
	}

	return (
		<div className="mt-2 flex flex-col items-end">
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
