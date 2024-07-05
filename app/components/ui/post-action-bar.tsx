import { Link } from '@remix-run/react'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { toImmutableReplyTree } from '#app/repositories/ranking.ts'
import { type TreeContext } from '#app/routes/post.$postId.tsx'
import {
	type Post,
	type ReplyTree,
	type CommentTreeState,
	type ImmutableReplyTree,
	Direction,
} from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { useOptionalUser } from '#app/utils/user.ts'
import { Icon } from './icon.tsx'

export function PostActionBar({
	post,
	replyTree,
	pathFromTargetPost,
	postDetailsRef,
	treeContext,
}: {
	post: Post
	replyTree: ImmutableReplyTree
	pathFromTargetPost: Immutable.List<number>
	postDetailsRef: React.RefObject<HTMLDivElement>
	treeContext: TreeContext
}) {
	const user = useOptionalUser()
	const loggedIn: boolean = user !== null
	const isAdminUser: boolean = user ? Boolean(user.isAdmin) : false

	const postState = treeContext.commentTreeState.posts[post.id]
	invariant(
		postState !== undefined,
		`post ${post.id} not found in commentTreeState`,
	)

	const [showReplyForm, setShowReplyForm] = useState(false)

	async function handleSetDeletedAt(deletedAt: number | null) {
		const payload = {
			postId: post.id,
			focussedPostId: treeContext.targetPostId,
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
		treeContext.setCommentTreeState(newCommentTreeState)
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

	const scrollIntoView = () => {
		if (postDetailsRef.current) {
			postDetailsRef.current.scrollIntoView()
		}
	}

	function showChildren() {
		treeContext.setCollapsedState({
			...treeContext.collapsedState,
			hideChildren: treeContext.collapsedState.hideChildren.set(post.id, false),
		})
	}

	const showInformedProbability = post.id == treeContext.targetPostId

	const pCurrent: number = treeContext.commentTreeState.posts[post.id]?.p || NaN
	const pCurrentString: String = (pCurrent * 100).toFixed(0) + '%'

	const submitVote = async function (direction: Direction) {
		const payLoad = {
			postId: post.id,
			focussedPostId: treeContext.targetPostId,
			direction: direction,
			currentVoteState: postState.voteState.vote,
		}
		const response = await fetch('/vote', {
			method: 'POST',
			body: JSON.stringify(payLoad),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		const newCommentTreeState = (await response.json()) as CommentTreeState
		treeContext.setCommentTreeState(newCommentTreeState)
	}

	const childrenHidden =
		treeContext.collapsedState.hideChildren.get(post.id) ?? false

	const hasChildren = !replyTree.replies.isEmpty()

	function toggleHideChildren() {
		treeContext.setCollapsedState({
			...treeContext.collapsedState,
			hideChildren: treeContext.collapsedState.hideChildren.set(
				post.id,
				!childrenHidden,
			),
		})
	}

	const isFocused =
		treeContext.collapsedState.currentlyFocussedPostId === post.id
	const isDeleted = postState.isDeleted
	const hideChildren =
		treeContext.collapsedState.hideChildren.get(post.id) ?? false

	const focusButtonColor = isFocused ? 'bg-rose-800/100 text-white' : ''

	return (
		<>
			<div className="flex w-full items-start gap-2 text-xl opacity-50 sm:text-base">
				{hasChildren &&
					(childrenHidden ? (
						<button title="Expand this comment" onClick={toggleHideChildren}>
							<Icon name="chevron-right" className="ml-[-0.2em]" />
						</button>
					) : (
						<button title="Collapse this comment" onClick={toggleHideChildren}>
							<Icon name="chevron-down" className="ml-[-0.2em]" />
						</button>
					))}
				{loggedIn && (
					<button
						title={'Upvote'}
						onClick={async () => await submitVote(Direction.Up)}
					>
						<Icon
							name={
								postState.voteState.vote == Direction.Up
									? 'thick-arrow-up-solid'
									: 'thick-arrow-up'
							}
						/>
					</button>
				)}
				{showInformedProbability && (
					<Link
						title="Informed upvote probability"
						to={`/stats/${post.id}`}
						className="mx-[-0.5em]"
					>
						{pCurrentString}
					</Link>
				)}
				{loggedIn && (
					<button
						title={'Downvote'}
						onClick={async () => await submitVote(Direction.Down)}
					>
						<Icon
							name={
								postState.voteState.vote == Direction.Down
									? 'thick-arrow-down-solid'
									: 'thick-arrow-down'
							}
							className="mt-[-0.2em]"
						/>
					</button>
				)}
				{false && (
					<button
						title={
							isFocused
								? 'Click again to unfocus'
								: 'Collapse unrelated comments'
						}
						className={`transition-color mr-2 rounded px-1 duration-1000 ${focusButtonColor}`}
						onClick={() => {
							treeContext.onCollapseParentSiblings(pathFromTargetPost)
							scrollIntoView()
						}}
					>
						<Icon name="target" /> Focus
					</button>
				)}
				{!isDeleted && loggedIn && (
					<button
						onClick={() => {
							setShowReplyForm(!showReplyForm)
							return false
						}}
						className="shrink-0"
					>
						<Icon name="chat-bubble" className="mt-[-0.1em]" /> Reply
					</button>
				)}
				{isAdminUser && (
					<AdminFeatureBar
						isDeleted={isDeleted}
						handleSetDeletedAt={handleSetDeletedAt}
						handleSetDiscussionOfTheDay={handleSetDiscussionOfTheDay}
					/>
				)}
				{hideChildren && (
					<button onClick={showChildren} className="shrink-0">
						({replyTree.replies.size}{' '}
						{replyTree.replies.size == 1 ? 'comment' : 'comments'})
					</button>
				)}
				{showReplyForm && (
					<button
						className="ml-auto self-center pr-2"
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
					treeContext={treeContext}
				/>
			)}
		</>
	)
}

function AdminFeatureBar({
	isDeleted,
	handleSetDeletedAt,
	handleSetDiscussionOfTheDay,
}: {
	isDeleted: boolean
	handleSetDeletedAt: (deletedAt: number | null) => void
	handleSetDiscussionOfTheDay: () => void
}) {
	return (
		<>
			{!isDeleted ? (
				<button className="mr-2" onClick={() => handleSetDeletedAt(Date.now())}>
					<Icon name="trash" className="mt-[-4px]" /> Delete
				</button>
			) : (
				<button className="mr-2" onClick={() => handleSetDeletedAt(null)}>
					<Icon name="counter-clockwise-clock" className="mt-[-4px]" /> Restore
				</button>
			)}
			<button
				className="mr-2"
				title="Promote the root post of this discussion to discussion of the day"
				onClick={handleSetDiscussionOfTheDay}
			>
				<Icon name="double-arrow-up" className="mt-[-4px]" /> Promote
			</button>
		</>
	)
}

function ReplyForm({
	post,
	setShowReplyForm,
	treeContext,
}: {
	post: Post
	setShowReplyForm: Dispatch<SetStateAction<boolean>>
	treeContext: TreeContext
}) {
	const [contentState, setContentState] = useState<string>('')

	const handleReplySubmit = async function () {
		setShowReplyForm(false)
		const payload = {
			parentId: post.id,
			focussedPostId: treeContext.targetPostId,
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
		treeContext.setCommentTreeState(responseDecoded.commentTreeState) // influences scores because reply receives a default vote
		treeContext.onReplySubmit(
			toImmutableReplyTree(responseDecoded.newReplyTree),
		)
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
