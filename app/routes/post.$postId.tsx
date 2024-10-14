import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { type MetaFunction, useLoaderData, useParams } from '@remix-run/react'
import Immutable from 'immutable'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { z } from 'zod'
import { EmbeddedTweet } from '#app/components/building-blocks/embedded-integration.tsx'
import { ParentThread } from '#app/components/building-blocks/parent-thread.tsx'
import { PostWithReplies } from '#app/components/building-blocks/post-with-replies.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { db } from '#app/database/db.ts'
import { getClaimContextByPollPostId } from '#app/modules/claims/claim-service.ts'
import { type ClaimContext } from '#app/modules/claims/claim-types.ts'
import { updateHN } from '#app/modules/hacker-news/hacker-news-service.ts'
import { getTransitiveParents } from '#app/modules/posts/post-repository.ts'
import { VoteDirection, type Post } from '#app/modules/posts/post-types.ts'
import {
	getCommentTreeState,
	getMutableReplyTree,
} from '#app/modules/posts/ranking/ranking-service.ts'
import {
	type MutableReplyTree,
	type CommentTreeState,
	type ReplyTree,
} from '#app/modules/posts/ranking/ranking-types.ts'
import {
	addReplyToReplyTree,
	toImmutableReplyTree,
} from '#app/modules/posts/ranking/ranking-utils.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariant } from '#app/utils/misc.tsx'
import { isValidTweetUrl } from '#app/utils/twitter-utils.ts'

const postIdSchema = z.coerce.number()

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const postId = postIdSchema.parse(params.postId)

	const {
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
		pollContext,
	}: {
		mutableReplyTree: MutableReplyTree
		transitiveParents: Post[]
		commentTreeState: CommentTreeState
		pollContext: ClaimContext | null
	} = await db.transaction().execute(async trx => {
		await updateHN(trx, postId)
		const commentTreeState = await getCommentTreeState(trx, postId, userId)
		const replyTree = await getMutableReplyTree(
			trx,
			postId,
			userId,
			commentTreeState,
		)
		const isPoll = replyTree.post.pollType !== null
		const pollContext = isPoll
			? await getClaimContextByPollPostId(trx, postId)
			: null
		return {
			mutableReplyTree: replyTree,
			transitiveParents: await getTransitiveParents(trx, postId),
			commentTreeState: commentTreeState,
			pollContext: pollContext,
		}
	})

	return json({
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
		pollContext,
	})
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	/* <meta property="og:title" content="Your Page Title">
<meta property="og:description" content="A brief description of your page">
<meta property="og:image" content="URL_to_image">
<meta property="og:url" content="URL_of_your_page">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Your Page Title">
<meta name="twitter:description" content="A brief description of your page">
<meta name="twitter:image" content="URL_to_image"></meta> */
	const title = 'Jabble'
	const description = data?.mutableReplyTree.post.content

	return [
		{
			title: title,
		},
		{
			property: 'og:title',
			content: title,
		},
		{
			property: 'twitter:title',
			content: title,
		},
		{
			name: 'description',
			content: description,
		},
		{
			name: 'og:description',
			content: description,
		},
		{
			name: 'twitter:description',
			content: description,
		},
	]
}

export default function PostPage() {
	const { mutableReplyTree, transitiveParents, commentTreeState, pollContext } =
		useLoaderData<typeof loader>()

	const replyTree = toImmutableReplyTree(mutableReplyTree)

	const params = useParams()

	// subcomponent and key needed for react to not preserve state on page changes
	return (
		<>
			<DiscussionView
				key={params['postId']}
				initialReplyTree={replyTree}
				transitiveParents={transitiveParents}
				initialCommentTreeState={commentTreeState}
				pollContext={pollContext}
			/>
		</>
	)
}

export type TreeContext = {
	onReplySubmit: (reply: ReplyTree) => void
	targetHasVote: boolean
	targetPostId: number
	commentTreeState: CommentTreeState
	setCommentTreeState: Dispatch<SetStateAction<CommentTreeState>>
	collapsedState: CollapsedState
	setCollapsedState: Dispatch<SetStateAction<CollapsedState>>
	onCollapseParentSiblings: (
		pathFromFocussedPost: Immutable.List<number>,
	) => void
}

export type CollapsedState = {
	currentlyFocussedPostId: number | null
	hidePost: Immutable.Map<number, boolean>
	hideChildren: Immutable.Map<number, boolean>
}

export function DiscussionView({
	initialReplyTree,
	transitiveParents,
	initialCommentTreeState,
	pollContext,
}: {
	initialReplyTree: ReplyTree
	transitiveParents: Post[]
	initialCommentTreeState: CommentTreeState
	pollContext: ClaimContext | null
}) {
	const [replyTreeState, setReplyTreeState] = useState(initialReplyTree)
	const [commentTreeState, setCommentTreeState] = useState<CommentTreeState>(
		initialCommentTreeState,
	)
	const [isCollapsedState, setIsCollapsedState] = useState<CollapsedState>({
		currentlyFocussedPostId: null,
		hidePost: Immutable.Map<number, boolean>(),
		hideChildren: Immutable.Map<number, boolean>(),
	})

	const postId = replyTreeState.post.id
	const postState = commentTreeState.posts[postId]
	invariant(
		postState !== undefined,
		`post ${postId} not found in commentTreeState`,
	)

	function onReplySubmit(reply: ReplyTree) {
		const newReplyTreeState = addReplyToReplyTree(replyTreeState, reply)
		setReplyTreeState(newReplyTreeState)
	}

	const treeContext: TreeContext = {
		onReplySubmit,
		targetHasVote: postState.voteState.vote !== VoteDirection.Neutral,
		targetPostId: postId,
		commentTreeState: commentTreeState,
		setCommentTreeState: setCommentTreeState,
		collapsedState: isCollapsedState,
		setCollapsedState: setIsCollapsedState,
		onCollapseParentSiblings: pathFromFocussedPost => {
			const newCollapseState = collapseParentSiblingsAndIndirectChildren(
				pathFromFocussedPost,
				isCollapsedState,
				replyTreeState,
			)
			if (
				isCollapsedState.currentlyFocussedPostId !==
				newCollapseState.currentlyFocussedPostId
			) {
				setIsCollapsedState(newCollapseState)
			} else {
				setIsCollapsedState({
					currentlyFocussedPostId: null,
					hidePost: Immutable.Map(),
					hideChildren: isCollapsedState.hideChildren,
				})
			}
		},
	}

	const isTweet = pollContext
		? isValidTweetUrl(pollContext?.artefact.url)
		: false

	const [showPollContext, setShowPollContext] = useState<boolean>(false)

	return (
		<>
			{pollContext && (
				<div className="mb-4">
					<button
						onClick={() => {
							setShowPollContext(!showPollContext)
							return false
						}}
						className="shrink-0 font-bold text-purple-700"
					>
						{showPollContext ? (
							<Icon name="chevron-down" className="mt-[-0.1em]" />
						) : (
							<Icon name="chevron-right" className="mt-[-0.1em]" />
						)}
						<span className="ml-2">Show context</span>
					</button>
					{showPollContext && (
						<div className="flex flex-col items-center p-4">
							{isTweet ? (
								<EmbeddedTweet tweetUrl={pollContext.artefact.url} />
							) : (
								<>
									<Icon name="quote" size="xl" className="mb-2 mr-auto" />
									{pollContext.quote.quote}
								</>
							)}
						</div>
					)}
				</div>
			)}
			<ParentThread transitiveParents={transitiveParents} />
			<PostWithReplies
				className={'mb-2 rounded-sm bg-post p-2'}
				replyTree={replyTreeState}
				pathFromTargetPost={Immutable.List([postId])}
				treeContext={treeContext}
			/>
			<div className="h-screen" />
		</>
	)
}

function collapseParentSiblingsAndIndirectChildren(
	pathFromFocussedPost: Immutable.List<number>,
	collapsedState: CollapsedState,
	replyTree: ReplyTree,
): CollapsedState {
	// go down the tree along the path
	// and collapse all siblings on the way.
	let newCollapseState = collapsedState
	let currentSubTree = replyTree
	pathFromFocussedPost.rest().forEach(postId => {
		// postId must be among currentSubTree.replies
		currentSubTree.replies.forEach(reply => {
			if (reply.post.id == postId) {
				// transitive parent
				newCollapseState = {
					...newCollapseState,
					hidePost: newCollapseState.hidePost.set(reply.post.id, false),
					hideChildren: newCollapseState.hideChildren.set(reply.post.id, false),
				}
				currentSubTree = reply
			} else {
				// sibling of transitive parent
				newCollapseState = {
					...newCollapseState,
					hidePost: newCollapseState.hidePost.set(reply.post.id, true),
				}
			}
		})
	})
	currentSubTree.replies.forEach(directChild => {
		newCollapseState = {
			...newCollapseState,
			hideChildren: newCollapseState.hideChildren.set(
				directChild.post.id,
				true,
			),
		}
	})
	newCollapseState = {
		...newCollapseState,
		currentlyFocussedPostId: pathFromFocussedPost.last(),
	}
	return newCollapseState
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => <p>Post not found</p>,
			}}
		/>
	)
}
