import * as Immutable from 'immutable'
import moment from 'moment'
import { type Dispatch, type SetStateAction } from 'react'
import { type ScoredPost } from '#app/ranking.ts'

export function PostInfoBar({
	post,
	pathFromFocussedPost,
	isConvincing,
	voteHereIndicator,
	isCollapsedState,
	setIsCollapsedState,
	onCollapseParentSiblings,
}: {
	post: ScoredPost
	pathFromFocussedPost: Immutable.List<number>
	isConvincing: boolean
	voteHereIndicator: boolean
	isCollapsedState?: Immutable.Map<number, boolean>
	setIsCollapsedState?: Dispatch<SetStateAction<Immutable.Map<number, boolean>>>
	onCollapseParentSiblings: (pathFromFocussedPost: Immutable.List<number>) => void
}) {
	const ageString = moment(post.createdAt).fromNow()

	const isCollapsed = isCollapsedState?.get(post.id) || false

	async function handleClick() {
		if (isCollapsedState && setIsCollapsedState) {
			console.log(isCollapsed)
			let newisCollapsedState = isCollapsedState.set(post.id, !isCollapsed)
			setIsCollapsedState(newisCollapsedState)
		}
	}

	return (
		<>
			<div className="flex w-full space-x-2 text-sm">
				{isConvincing && (
					<span title="Convincing" className="">
						💡
					</span>
				)}
				<span className="opacity-50">{ageString}</span>
				<span className="opacity-50">-</span>
				<span className="opacity-50">{post.oSize} votes</span>
				{voteHereIndicator && (
					<span
						title="Take a position here to give your vote above more weight"
						className="rounded bg-blue-100 px-1 text-blue-500 dark:bg-[#2c333e] dark:text-[#7dcfff]"
					>
						Vote here
					</span>
				)}
				{isCollapsedState && (
					<button className="text-gray ml-2 text-sm" onClick={handleClick}>
						{isCollapsed ? '[+]' : '[-]'}
					</button>
				)}
				<button onClick={() => onCollapseParentSiblings(pathFromFocussedPost)}>
					◎
				</button>
			</div>
		</>
	)
}
