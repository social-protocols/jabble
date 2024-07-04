import type * as Immutable from 'immutable'
import moment from 'moment'
import { useRef, type Dispatch, type SetStateAction } from 'react'
import { effectSizeOnTarget } from '#app/repositories/ranking.ts'
import { type PostState, type Post } from '#app/types/api-types.ts'
import { Icon } from './icon.tsx'

export function PostInfoBar({
	post,
	postState,
	pathFromFocussedPost,
	voteHereIndicator,
	isCollapsedState,
	setIsCollapsedState,
	onCollapseParentSiblings,
}: {
	post: Post
	postState: PostState
	pathFromFocussedPost: Immutable.List<number>
	voteHereIndicator: boolean
	isCollapsedState?: Immutable.Map<number, boolean>
	setIsCollapsedState?: Dispatch<SetStateAction<Immutable.Map<number, boolean>>>
	onCollapseParentSiblings: (
		pathFromFocussedPost: Immutable.List<number>,
	) => void
}) {
	const ageString = moment(post.createdAt).fromNow()
	const effectSize = effectSizeOnTarget(postState.effectOnTargetPost)

	const isCollapsed = isCollapsedState?.get(post.id) || false

	function toggleCollapse() {
		if (isCollapsedState && setIsCollapsedState) {
			let newisCollapsedState = isCollapsedState.set(post.id, !isCollapsed)
			setIsCollapsedState(newisCollapsedState)
		}
	}

	const myRef = useRef<HTMLDivElement>(null)
	const scrollIntoView = () => {
		if (myRef.current) {
			myRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}

	return (
		<>
			<div className="flex w-full items-center space-x-2 text-xs sm:items-baseline">
				{postState.effectOnTargetPost !== null ? (
					<span className={`${scaleColorConvincing(effectSize)}`}>
						convincing: {effectSize.toFixed(2)}
					</span>
				) : (
					''
				)}
				{voteHereIndicator && (
					<span
						title="Take a position here to give your vote above more weight"
						className="rounded bg-blue-100 px-1 text-blue-500 dark:bg-[#2c333e] dark:text-[#7dcfff]"
					>
						Vote here
					</span>
				)}
				<span className="opacity-50">{ageString}</span>
				<span className="opacity-50">{postState.voteCount} votes</span>
				{isCollapsedState && (
					<>
						<button
							title={
								isCollapsed ? 'Expand this comment' : 'Collapse this comment'
							}
							className="text-[30px] sm:text-base"
							onClick={toggleCollapse}
						>
							{isCollapsed ? (
								<Icon name="plus-circled" />
							) : (
								<Icon name="minus-circled" />
							)}
						</button>
						<button
							title="Collapse unrelated comments"
							className="my-[-2px] text-[30px] sm:text-base"
							onClick={() => {
								onCollapseParentSiblings(pathFromFocussedPost)
								scrollIntoView()
							}}
						>
							<Icon name="target" />
						</button>
					</>
				)}
			</div>
		</>
	)
}

function scaleColorConvincing(effectSize: number): string {
	// Convert a numeric effect size (in bits) to a color class.
	// So far, the mapping is arbitrary, we can replace this with a more
	// sophisticated function once we know what values are common and once we get
	// a feeling for what values are large or small.
	if (effectSize < 0.1) {
		return 'text-blue-200 dark:text-blue-900'
	} else if (effectSize < 0.2) {
		return 'text-blue-300 dark:text-blue-800'
	} else if (effectSize < 0.3) {
		return 'text-blue-400 dark:text-blue-700'
	} else if (effectSize < 0.5) {
		return 'text-blue-500 dark:text-blue-600'
	} else if (effectSize < 0.7) {
		return 'text-blue-600 dark:text-blue-500'
	} else {
		return 'text-blue-700 dark:text-blue-400'
	}
}
