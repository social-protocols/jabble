import { useNavigate } from '@remix-run/react'
import { type Map } from 'immutable'
import { type Dispatch, type SetStateAction } from 'react'
import { type CommentTreeState, type ScoredPost } from '#app/ranking.ts'
import { defaultVoteState, Direction } from '#app/vote.ts'
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
	loggedIn,
	isConvincing,
	voteHereIndicator,
	className,
	focussedPostId,
	postDataState,
	setPostDataState,
	isCollapsedState,
	setIsCollapsedState,
}: {
	post: ScoredPost
	teaser: boolean
	loggedIn: boolean
	isConvincing?: boolean
	voteHereIndicator?: boolean
	className?: string
	focussedPostId: number
	postDataState: CommentTreeState
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
	isCollapsedState?: Immutable.Map<number, boolean>
	setIsCollapsedState?: Dispatch<SetStateAction<Map<number, boolean>>>
}) {
	voteHereIndicator = voteHereIndicator || false

	const currentVoteState =
		postDataState[post.id]?.voteState || defaultVoteState(post.id)
	const needsVoteOnCriticalComment: boolean =
		currentVoteState.vote !== Direction.Neutral && !currentVoteState.isInformed

	const isCollapsed = isCollapsedState?.get(post.id) || false

	const navigate = useNavigate()

	return (
		<div className={'flex w-full ' + (className ? className : '')}>
			{isCollapsed ? (
				<div className="ml-[42px] flex">
					<PostInfoBar
						post={post}
						isConvincing={isConvincing || false}
						voteHereIndicator={voteHereIndicator}
						isCollapsedState={isCollapsedState}
						setIsCollapsedState={setIsCollapsedState}
					/>
				</div>
			) : (
				<>
					<div style={{ display: loggedIn ? 'block' : 'none' }}>
						<VoteButtons
							postId={post.id}
							focussedPostId={focussedPostId}
							pCurrent={postDataState[post.id]?.p || NaN}
							needsVoteOnCriticalComment={needsVoteOnCriticalComment}
							postDataState={postDataState}
							setPostDataState={setPostDataState}
						/>
					</div>
					<div
						className={
							'ml-2 flex w-full min-w-0 flex-col space-y-1' +
							(teaser ? ' postteaser' : '')
						}
					>
						<PostInfoBar
							post={post}
							isConvincing={isConvincing || false}
							voteHereIndicator={voteHereIndicator}
							isCollapsedState={isCollapsedState}
							setIsCollapsedState={setIsCollapsedState}
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
								onClick={() =>
									`/post/${post.id}` && navigate(`/post/${post.id}`)
								}
							>
								This post was deleted.
							</div>
						)}
						<PostActionBar post={post} loggedIn={loggedIn} />
					</div>
				</>
			)}
		</div>
	)
}
