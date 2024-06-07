import { useFetcher, useNavigate } from '@remix-run/react'
import { type FormEvent } from 'react'
import { type ScoredPost } from '#app/ranking.ts'
import { type VoteState, defaultVoteState, Direction } from '#app/vote.ts'
import { PostActionBar } from './post-action-bar.tsx'
import { PostContent } from './post-content.tsx'
import { PostInfoBar } from './post-info-bar.tsx'
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
	voteHereIndicator,
}: {
	post: ScoredPost
	teaser: boolean
	voteState?: VoteState
	loggedIn: boolean
	onVote?: Function
	isConvincing?: boolean
	voteHereIndicator?: boolean
}) {
	voteHereIndicator = voteHereIndicator || false

	// So we need to get the current state of the user's vote on this post from the fetcher
	const voteFetcher = useFetcher<{ voteState: VoteState; postId: number }>()

	const visibleVoteState = voteState || defaultVoteState(post.id)
	const needsVoteOnCriticalComment: boolean =
		visibleVoteState.vote !== Direction.Neutral && !visibleVoteState.isInformed

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
					<VoteButtons
						postId={post.id}
						vote={visibleVoteState}
						nVotes={post.oSize}
						voteHereIndicator={voteHereIndicator}
						needsVoteOnCriticalComment={needsVoteOnCriticalComment}
					/>
				</voteFetcher.Form>
			</div>
			<div
				className={
					'mb-3 flex w-full min-w-0 flex-col space-y-1' +
					(teaser ? ' postteaser' : '')
				}
			>
				<PostInfoBar
					post={post}
					isConvincing={isConvincing || false}
					needsVoteOnCriticalComment={needsVoteOnCriticalComment}
					voteHereIndicator={voteHereIndicator}
				/>
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
					isConvincing={isConvincing || false}
					loggedIn={loggedIn}
					needsVoteOnCriticalComment={needsVoteOnCriticalComment}
					voteHereIndicator={voteHereIndicator}
				/>
			</div>
		</div>
	)
}
