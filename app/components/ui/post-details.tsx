import { useFetcher, useNavigate } from '@remix-run/react'
import { type FormEvent } from 'react'
import { type ScoredPost } from '#app/ranking.ts'
import { type VoteState, defaultVoteState } from '#app/vote.ts'
import { PostActionBar } from './post-action-bar.tsx'
import { PostContent } from './post-content.tsx'
import { VoteButtons } from './vote-buttons.tsx'

/* Keep this relatively high, so people don't often have to click "read more"
   to read most content. But also not too high, so people don't have to
   scroll past big walls of text of posts they are not interested in */
const postTeaserMaxLines = 20

export function PostDetails({
	post,
	teaser,
	voteState,
	loggedIn,
	onVote,
	isConvincing,
}: {
	post: ScoredPost
	teaser: boolean
	voteState?: VoteState
	loggedIn: boolean
	onVote?: Function
	isConvincing?: boolean
}) {
	// So we need to get the current state of the user's vote on this post from the fetcher
	const voteFetcher = useFetcher<{ voteState: VoteState; postId: number }>()

	const visibleVoteState = voteState || defaultVoteState(post.id)

	const handleVoteSubmit = function (event: FormEvent<HTMLFormElement>) {
		onVote && onVote()
		voteFetcher.submit(event.currentTarget) // this will work as the normal Form submit but you trigger it
	}

	const navigate = useNavigate()

	return (
		<div className={'flex w-full'}>
			<div className={'mr-2'} style={{ display: loggedIn ? 'block' : 'none' }}>
				<voteFetcher.Form
					method="POST"
					action="/vote"
					onSubmit={handleVoteSubmit}
				>
					<VoteButtons postId={post.id} vote={visibleVoteState} />
				</voteFetcher.Form>
			</div>
			<div
				className={
					'mb-3 flex min-w-0 flex-col space-y-1' + (teaser ? ' postteaser' : '')
				}
			>
				{post.deletedAt == null ? (
					<PostContent
						content={post.content}
						maxLines={teaser ? postTeaserMaxLines : undefined}
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
				) : (
					<div
						style={{ cursor: 'pointer' }}
						className={'italic text-gray-400'}
						onClick={() => `/post/${post.id}` && navigate(`/post/${post.id}`)}
					>
						This post was deleted.
					</div>
				)}
				<PostActionBar
					post={post}
					visibleVoteState={visibleVoteState}
					isConvincing={isConvincing || false}
					loggedIn={loggedIn}
				/>
			</div>
		</div>
	)
}
