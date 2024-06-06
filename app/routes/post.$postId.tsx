import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ParentThread } from '#app/components/ui/parent-thread.tsx'
import { PostDetails } from '#app/components/ui/post.tsx'
import { type Post } from '#app/db/types.ts'
import { db } from '#app/db.ts'
import { getTransitiveParents } from '#app/post.ts'
import {
	type ReplyTree,
	type ScoredPost,
	getReplyTree,
	getScoredPost,
} from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'

const postIdSchema = z.coerce.number()

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const loggedIn = userId !== null

	const postId = postIdSchema.parse(params.postId)
	const post: ScoredPost = await db
		.transaction()
		.execute(async trx => getScoredPost(trx, postId))

	const replyTree: ReplyTree = await db
		.transaction()
		.execute(async trx => getReplyTree(trx, postId))

	const transitiveParents = await db
		.transaction()
		.execute(async trx => getTransitiveParents(trx, post.id))

	return json({ post, replyTree, transitiveParents, loggedIn })
}

export default function Post() {
	const { post, replyTree, transitiveParents, loggedIn } =
		useLoaderData<typeof loader>()
	return (
		<>
			<ParentThread transitiveParents={transitiveParents} />
			<div className={'mb-2 rounded-sm p-2 bg-post'}>
				<PostDetails post={post} teaser={false} loggedIn={loggedIn} />
			</div>
			<div className={'border-left-solid border-l-4 border-post pl-3 ml-2'}>
				<TreeReplies replyTree={replyTree} loggedIn={loggedIn} />
			</div>
		</>
	)
}

export function TreeReplies({
	replyTree,
	loggedIn,
}: {
	replyTree: ReplyTree
	loggedIn: boolean
}) {
	if (replyTree.replies.length === 0) {
		return <></>
	}
	return (
		<>
			{replyTree.replies.map(tree => {
				return (
					<>
						<PostDetails key={tree.post.id} post={tree.post} teaser={false} loggedIn={loggedIn} />
						<div
							key={`${tree.post.id}-threadline`}
							className={
								'border-left-solid border-l-4 border-post pl-3 ml-2'
							}
						>
							<TreeReplies key={`${tree.post.id}-children`} replyTree={tree} loggedIn={loggedIn} />
						</div>
					</>
				)
			})}
		</>
	)
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
