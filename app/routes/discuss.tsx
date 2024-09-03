import { type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { Button } from '#app/components/ui/button.tsx'
import { InfoText } from '#app/components/ui/info-text.tsx'
import { PostContent } from '#app/components/ui/post-content.tsx'
import { PostForm } from '#app/components/ui/post-form.tsx'
import { db } from '#app/db.ts'
import * as rankingTs from '#app/repositories/ranking.ts'
import { type FrontPagePost } from '#app/types/api-types.ts'
import { getUserId } from '#app/utils/auth.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const loggedIn = userId !== null
	const feed = await db.transaction().execute(async trx => {
		return await rankingTs.getChronologicalToplevelPosts(trx)
	})
	return { loggedIn, feed }
}

export default function Explore() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
	let data = useLoaderData<typeof loader>()

	return <FrontpageFeed feed={data.feed} loggedIn={data.loggedIn} />
}

export function FrontpageFeed({
	feed,
	loggedIn,
}: {
	feed: FrontPagePost[]
	loggedIn: boolean
}) {
	const [showNewDiscussionForm, setShowNewDiscussionForm] = useState(true)

	return (
		<div>
			<InfoText />

			{showNewDiscussionForm ? (
				<PostForm className="mb-4" />
			) : (
				loggedIn && <div className="mb-4">{newDiscussionButton()}</div>
			)}

			<div className="mx-auto w-full">
				<PostList feed={feed} />
			</div>
		</div>
	)

	function newDiscussionButton() {
		return (
			<Button
				variant="secondary"
				onClick={() => {
					setShowNewDiscussionForm(!showNewDiscussionForm)
					return false
				}}
			>
				New Fact-Check
			</Button>
		)
	}
}

function PostList({ feed }: { feed: FrontPagePost[] }) {
	const filteredFeed = feed.filter(post => !post.isPrivate)
	return filteredFeed.map(post => {
		return <TopLevelPost key={post.id} post={post} className="flex-1" />
	})
}

export function TopLevelPost({
	post,
	className,
}: {
	post: FrontPagePost
	className?: string
}) {
	const ageString = moment(post.createdAt).fromNow()
	const commentString = post.nTransitiveComments == 1 ? 'comment' : 'comments'
	const voteString = post.oSize == 1 ? 'vote' : 'votes'

	const pCurrent: number = post.p || NaN
	const pCurrentString: String = (pCurrent * 100).toFixed(0) + '%'

	return (
		<div
			className={
				'mb-2 w-full min-w-0 rounded-sm bg-post px-3 py-2 ' + (className || '')
			}
		>
			<div className="flex">
				<div className="flex w-full flex-col">
					<div className="mb-2 text-sm opacity-50">{ageString}</div>
					<PostContent
						content={post.content}
						maxLines={2}
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
					<div className="mt-auto text-sm opacity-50">
						<Link to={`/post/${post.id}`}>
							{post.nTransitiveComments} {commentString}
						</Link>
					</div>
				</div>
				<div className="ml-2 mr-1 min-w-32 space-y-1 opacity-50">
					<div className="text-sm">Accuracy estimate:</div>
					<div className="text-4xl">{pCurrentString}</div>
					<div className="text-sm">
						{post.oSize} {voteString}
					</div>
				</div>
			</div>
		</div>
	)
}

