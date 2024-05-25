import { type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { PostForm } from '#app/components/ui/post-form.tsx'
import { PostContent, CommentIcon } from '#app/components/ui/post.tsx'
import { db } from '#app/db.ts'
import * as rankingTs from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'

export default function Index() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
	let data = useLoaderData<typeof loader>()

	return <FrontpageFeed feed={data.feed} loggedIn={data.loggedIn} />
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const loggedIn = userId !== null
	const feed = await db.transaction().execute(async trx => {
		return rankingTs.getChronologicalToplevelPosts(trx)
	})
	return { loggedIn, feed }
}

export function FrontpageFeed({
	feed,
	loggedIn,
}: {
	feed: rankingTs.ScoredPost[]
	loggedIn: boolean
}) {
	const [showNewDiscussionForm, setShowNewDiscussionForm] = useState(false)

	const infoText = `
# Welcome to Jabble

Jabble is a new kind of conversation platform, designed to make conversations on the Internet more intelligent and less polarized.

Read [how Jabble makes conversations better](https://github.com/social-protocols/social-network#readme) and [signup here to get notified when we launch](https://social-protocols.org/social-network/).
	`

	return (
		<div className="container">
			<div className="markdown mb-10">
				<Markdown deactivateLinks={false}>{infoText}</Markdown>
			</div>

			{showNewDiscussionForm ? (
				<PostForm tag="global" className="mb-4" />
			) : (
				loggedIn && (
					<div className="mb-4 flex justify-end">{newDiscussionButton()}</div>
				)
			)}

			<div className="mx-auto w-full">
				<PostList feed={feed} />
			</div>
		</div>
	)

	function newDiscussionButton() {
		return (
			<Button
				variant="default"
				onClick={() => {
					setShowNewDiscussionForm(!showNewDiscussionForm)
					return false
				}}
			>
				New Discussion
			</Button>
		)
	}
}

function PostList({ feed }: { feed: rankingTs.ScoredPost[] }) {
	return feed.map(post => {
		return <TopLevelPost key={post.id} post={post} className="flex-1" />
	})
}

export function TopLevelPost({
	post,
	className,
}: {
	post: rankingTs.ScoredPost
	className?: string
}) {
	const legacyTag = 'global'

	const ageString = moment(post.createdAt).fromNow()

	return (
		<div
			className={`mb-5 flex w-full flex-row space-x-4 rounded-lg bg-post px-5 pb-5 ${
				className || ''
			}`}
		>
			<div className="postteaser flex w-full min-w-0 flex-col">
				<div className="mt-1 text-right text-sm opacity-50">{ageString}</div>
				<PostContent
					content={post.content}
					maxLines={3}
					deactivateLinks={false}
					linkTo={`/tags/${legacyTag}/posts/${post.id}`}
				/>
				<div className="mt-2 flex w-full text-sm">
					<Link to={`/tags/${legacyTag}/posts/${post.id}`} className="ml-2">
						<CommentIcon needsVote={false} nReplies={post.nReplies} />
					</Link>
				</div>
			</div>
		</div>
	)
}
