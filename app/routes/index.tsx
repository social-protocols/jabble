import { json, type LoaderFunctionArgs, redirect } from '@remix-run/node'
import { useLoaderData, useParams } from '@remix-run/react'
import { useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { db } from '#app/db.ts'
import { updateHN } from '#app/repositories/hackernews.ts'
import {
	getDiscussionOfTheDay,
	getTransitiveParents,
} from '#app/repositories/post.ts'
import { getCommentTreeState, getReplyTree } from '#app/repositories/ranking.ts'
import {
	type CommentTreeState,
	type ReplyTree,
	type Post,
} from '#app/types/api-types.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { DiscussionView } from './post.$postId.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const discussionOfTheDayPostId = await db
		.transaction()
		.execute(async trx => await getDiscussionOfTheDay(trx))
	const userId: string | null = await getUserId(request)
	const loggedIn = userId !== null

	if (discussionOfTheDayPostId === undefined) {
		console.log(
			"Couldn't find current discussion of the day post, redirecting to /explore",
		)
		return redirect('/explore')
	}

	const {
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
	}: {
		mutableReplyTree: ReplyTree
		transitiveParents: Post[]
		commentTreeState: CommentTreeState
	} = await db.transaction().execute(async trx => {
		await updateHN(trx, discussionOfTheDayPostId)
		return {
			mutableReplyTree: await getReplyTree(
				trx,
				discussionOfTheDayPostId,
				userId,
			),
			transitiveParents: await getTransitiveParents(
				trx,
				discussionOfTheDayPostId,
			),
			commentTreeState: await getCommentTreeState(
				trx,
				discussionOfTheDayPostId,
				userId,
			),
		}
	})

	return json({
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
		loggedIn,
	})
}

export default function Index() {
	const { mutableReplyTree, transitiveParents, commentTreeState, loggedIn } =
		useLoaderData<typeof loader>()

	const [showInfoText, setShowInfoText] = useState(false)

	const params = useParams()

	const titleHeader = "## Today's Discussion"

	const infoText = `
If you found your way here, it means that you are part of our earliest experiments with users!
This means that everything that you see here is **highly experimental**.
We are just learning as we go and we would be eternally grateful for your [feedback](https://forms.gle/dzJtsTJwPSsBihPUA)!

If you want to see more posts, visit our [explore page](/explore).
	`

	const infoTextClass = showInfoText ? '' : 'hidden'

	return (
		<>
			<div className="markdown mb-6 text-sm">
				<Markdown deactivateLinks={false}>{titleHeader}</Markdown>
				<div
					className="cursor-pointer border-l-4 border-solid border-blue-500 pl-2"
					title="Click to expand"
					onClick={() => setShowInfoText(!showInfoText)}
				>
					<span className="text-blue-500">
						<Markdown deactivateLinks={false}>🔵 **Info**</Markdown>
					</span>
					<div className={infoTextClass}>
						<Markdown deactivateLinks={false}>{infoText}</Markdown>
					</div>
				</div>
			</div>
			<DiscussionView
				key={params['postId']}
				mutableReplyTree={mutableReplyTree}
				transitiveParents={transitiveParents}
				initialCommentTreeState={commentTreeState}
				loggedIn={loggedIn}
			/>
		</>
	)
}
