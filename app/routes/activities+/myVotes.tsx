import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { PostContent } from '#app/components/ui/post-content.tsx'
import { db } from '#app/db.ts'
import { getPost } from '#app/repositories/post.ts'
import { getAllCurrentVotes } from '#app/repositories/vote.ts'
import { type Post, type VoteState } from '#app/types/api-types.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

type PostWithVote = Post & VoteState

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const postsWithVotes: PostWithVote[] = await db
		.transaction()
		.execute(async trx => {
			const userVotesWithNeutrals = await getAllCurrentVotes(trx, userId)
			const userVotes = userVotesWithNeutrals.filter(vote => vote.vote !== 0)
			return await Promise.all(
				userVotes.map(async vote => {
					const post = await getPost(trx, vote.postId)
					return { ...post, ...vote }
				}),
			)
		})

	return json({ postsWithVotes })
}

export default function MyVotes() {
	const { postsWithVotes } = useLoaderData<typeof loader>()

	const introMarkdown = `
# Review your Votes

On this page, you can review your past votes.
Sometimes you change your mind and that's okay.
In fact, we encourage it.
	`

	const [onlyUninformedVotes, setOnlyUninformedVotes] = useState(false)

	const onlyUninformedButtonClass = onlyUninformedVotes
		? 'bg-blue-600 text-white'
		: 'bg-gray-200 text-black'

	return (
		<>
			<div className="mb-8 space-y-4">
				<Markdown deactivateLinks={false}>{introMarkdown}</Markdown>
				<button
					className={'rounded px-1 ' + onlyUninformedButtonClass}
					onClick={() => setOnlyUninformedVotes(!onlyUninformedVotes)}
				>
					only uninformed votes
				</button>
			</div>
			<div className="space-y-8">
				{postsWithVotes.map(postWithVote => {
					if (onlyUninformedVotes && postWithVote.isInformed) {
						return <></>
					}
					return (
						<CurrentVoteListItem
							key={postWithVote.postId}
							postWithVote={postWithVote}
							isUpvote={postWithVote.vote === 1}
						/>
					)
				})}
			</div>
		</>
	)
}

function CurrentVoteListItem({
	postWithVote,
	isUpvote,
}: {
	postWithVote: PostWithVote
	isUpvote: boolean
}) {
	return (
		<>
			<div className="flex w-full flex-col">
				<PostContent
					linkTo={`/post/${postWithVote.id}`}
					content={postWithVote.content}
					deactivateLinks={false}
				/>
				<div className="flex w-full">
					<div className="items-end space-x-2">
						<span className="italic text-gray-500">You voted:</span>
						<span>
							{isUpvote ? (
								<Icon name="thick-arrow-up" />
							) : (
								<Icon name="thick-arrow-down" />
							)}
						</span>
					</div>
				</div>
			</div>
		</>
	)
}
