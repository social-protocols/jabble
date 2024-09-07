import {
	type Dispatch,
	type SetStateAction,
	useState,
	type ChangeEvent,
	useRef,
} from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { toImmutableReplyTree } from '#app/repositories/ranking.ts'
import { type TreeContext } from '#app/routes/post.$postId.tsx'
import {
	type Post,
	type ReplyTree,
	type CommentTreeState,
	type ImmutableReplyTree,
	Direction,
	type PostState,
} from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { useOptionalUser } from '#app/utils/user.ts'
import { Icon } from './icon.tsx'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'

export function PostActionBar({
	post,
	replyTree,
	pathFromTargetPost,
	postDetailsRef,
	treeContext,
	postState,
}: {
	post: Post
	replyTree: ImmutableReplyTree
	pathFromTargetPost: Immutable.List<number>
	postDetailsRef: React.RefObject<HTMLDivElement>
	treeContext: TreeContext
	postState: PostState
}) {
	const user = useOptionalUser()
	const loggedIn: boolean = user !== null
	const isAdminUser: boolean = user ? Boolean(user.isAdmin) : false
	const [showAdminUI, setShowAdminUI] = useState(false)

	const targetPostState =
		treeContext.commentTreeState.posts[treeContext.targetPostId]
	invariant(
		targetPostState !== undefined,
		`State for target post ${treeContext.targetPostId} not found`,
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

	async function handleAdminRefreshPost() {
		await fetch(`/refresh/${post.id}`, {
			method: 'POST',
		})
		location.reload()
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

	const isTargetPost = post.id == treeContext.targetPostId

	const isTopLevelPost = post.parentId === null

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
		if (childrenHidden) {
			// expand
			let newHideChildrenState = treeContext.collapsedState.hideChildren.set(
				post.id,
				false,
			)
			// collapse direct children
			replyTree.replies.forEach(reply => {
				newHideChildrenState = newHideChildrenState.set(reply.post.id, true)
			})
			treeContext.setCollapsedState({
				...treeContext.collapsedState,
				hideChildren: newHideChildrenState,
			})
		} else {
			// collapse
			treeContext.setCollapsedState({
				...treeContext.collapsedState,
				hideChildren: treeContext.collapsedState.hideChildren.set(
					post.id,
					true,
				),
			})
		}
	}

	const isFocused =
		treeContext.collapsedState.currentlyFocussedPostId === post.id
	const isDeleted = postState.isDeleted
	const hideChildren =
		treeContext.collapsedState.hideChildren.get(post.id) ?? false

	const focusButtonColor = isFocused ? 'bg-rose-800/100 text-white' : ''

	return (
		<>
			<div className="flex w-full flex-wrap items-start gap-3 text-xl opacity-50 sm:text-base">
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
				{loggedIn &&
					(!isTargetPost || !isTopLevelPost || !treeContext.isFactCheck) && (
						<>
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
							<span className="mx-[-0.6em]">Vote</span>
							<button
								title={'Downvote'}
								onClick={async () => await submitVote(Direction.Down)}
								className="mr-[0.3em]"
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
						</>
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
				{isAdminUser &&
					(showAdminUI ? (
						<AdminFeatureBar
							isDeleted={isDeleted}
							handleSetDeletedAt={handleSetDeletedAt}
							handleAdminRefreshPost={handleAdminRefreshPost}
						/>
					) : (
						<button
							className="self-center"
							onClick={() => setShowAdminUI(true)}
						>
							<Icon name="dots-horizontal" />
						</button>
					))}
				{hideChildren && replyTree.replies.size > 0 && (
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
	handleAdminRefreshPost,
}: {
	isDeleted: boolean
	handleSetDeletedAt: (deletedAt: number | null) => void
	handleAdminRefreshPost: () => void
}) {
	return (
		<>
			{!isDeleted ? (
				<button onClick={() => handleSetDeletedAt(Date.now())}>
					<Icon name="trash" className="mt-[-0.1em]" />
					Delete
				</button>
			) : (
				<button onClick={() => handleSetDeletedAt(null)}>
					<Icon name="counter-clockwise-clock" className="mt-[-0.1em]" />{' '}
					Restore
				</button>
			)}
			<button
				title="refresh labels"
				onClick={handleAdminRefreshPost}
				className="shrink-0"
			>
				<Icon name="reload" className="mt-[-0.1em]" /> Refresh Labels
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
	const storageKey = `reply-${post.id}`

	const [contentState, setContentState] = useState<string>(
		// read backup from localstorage
		() => localStorage.getItem(storageKey) ?? '',
	)

	const debouncedChangeHandler = useDebounce(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			// backup text in localstorage to be robust against reloads and collapses
			localStorage.setItem(storageKey, event.target.value)
		},
		500,
	)

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
		// after successful submission, remove from localstorage
		localStorage.removeItem(storageKey)
		treeContext.setCommentTreeState(responseDecoded.commentTreeState) // influences scores because reply receives a default vote
		treeContext.onReplySubmit(
			toImmutableReplyTree(responseDecoded.newReplyTree),
		)
	}

	return (
		<div className="mt-2 flex flex-col items-end">
			<TextareaAutosize
				name="content"
				className="mb-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid]:border-input-invalid"
				style={{
					resize: 'vertical',
				}}
				autoFocus={true}
				placeholder="Enter your reply"
				value={contentState}
				maxLength={MAX_CHARS_PER_POST}
				onChange={event => {
					debouncedChangeHandler(event)
					const value = event.currentTarget.value
					setContentState(value)
				}}
			/>
			<button
				className="rounded bg-blue-200 px-4 py-2 text-base font-bold hover:bg-blue-300"
				onClick={handleReplySubmit}
			>
				Reply
			</button>
		</div>
	)
}

function useDebounce<T>(callback: (event: T) => void, delay: number) {
	const timer = useRef<number | null>(null)

	return (event: T) => {
		if (timer.current) {
			clearTimeout(timer.current)
		}
		timer.current = window.setTimeout(() => {
			callback(event)
		}, delay)
	}
}
