import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { type MetaFunction, useLoaderData, useParams } from '@remix-run/react'
import * as Immutable from 'immutable'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { z } from 'zod'
import { ParentThread } from '#app/components/building-blocks/parent-thread.tsx'
import { PostWithReplies } from '#app/components/building-blocks/post-with-replies.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { db } from '#app/db.ts'
import { updateHN } from '#app/modules/hacker-news/hacker-news-service.ts'
import { getTransitiveParents } from '#app/modules/posts/post-repository.ts'
import { type Post } from '#app/modules/posts/post-types.ts'
import {
	addReplyToReplyTree,
	getCommentTreeState,
	getReplyTree,
	toImmutableReplyTree,
} from '#app/modules/posts/scoring/ranking-service.ts'
import {
	Direction,
	type ReplyTree,
	type CommentTreeState,
	type ImmutableReplyTree,
	type CollapsedState,
} from '#app/types/api-types.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariant } from '#app/utils/misc.tsx'

const postIdSchema = z.coerce.number()

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const postId = postIdSchema.parse(params.postId)

	const {
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
	}: {
		mutableReplyTree: ReplyTree
		transitiveParents: Post[]
		commentTreeState: CommentTreeState
	} = await db.transaction().execute(async trx => {
		await updateHN(trx, postId)
		const commentTreeState = await getCommentTreeState(trx, postId, userId)
		return {
			mutableReplyTree: await getReplyTree(
				trx,
				postId,
				userId,
				commentTreeState,
			),
			transitiveParents: await getTransitiveParents(trx, postId),
			commentTreeState: commentTreeState,
		}
	})

	return json({
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
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
	const { mutableReplyTree, transitiveParents, commentTreeState } =
		useLoaderData<typeof loader>()

	const params = useParams()

	// subcomponent and key needed for react to not preserve state on page changes
	return (
		<>
			<DiscussionView
				key={params['postId']}
				mutableReplyTree={mutableReplyTree}
				transitiveParents={transitiveParents}
				initialCommentTreeState={commentTreeState}
			/>
		</>
	)
}

export type TreeContext = {
	onReplySubmit: (reply: ImmutableReplyTree) => void
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

export function DiscussionView({
	mutableReplyTree,
	transitiveParents,
	initialCommentTreeState,
}: {
	mutableReplyTree: ReplyTree
	transitiveParents: Post[]
	initialCommentTreeState: CommentTreeState
}) {
	const initialReplyTree = toImmutableReplyTree(mutableReplyTree)

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

	function onReplySubmit(reply: ImmutableReplyTree) {
		const newReplyTreeState = addReplyToReplyTree(replyTreeState, reply)
		setReplyTreeState(newReplyTreeState)
	}

	const treeContext: TreeContext = {
		onReplySubmit,
		targetHasVote: postState.voteState.vote !== Direction.Neutral,
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

	return (
		<>
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
	replyTree: ImmutableReplyTree,
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
