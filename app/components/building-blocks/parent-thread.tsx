import { Link } from '@remix-run/react'
import { useState } from 'react'
import { Icon } from '#app/components/ui/icon.tsx'
import { type Post } from '#app/modules/posts/post-types.ts'
import { PostContent } from './post-content.tsx'

export function ParentThread({
	transitiveParents,
}: {
	transitiveParents: Post[]
}) {
	return (
		<div>
			{transitiveParents.map(parentPost => (
				<ParentPost key={parentPost.id} parentPost={parentPost} />
			))}
		</div>
	)
}
function ParentPost({ parentPost }: { parentPost: Post }) {
	const [isCollapsed, setIsCollapsed] = useState(true)

	return (
		<div
			key={parentPost.id}
			className="postparent mb-2 flex items-start border-l-4 border-solid border-postparent-threadline pl-2 text-sm text-postparent-foreground"
		>
			{parentPost.deletedAt == null ? (
				<>
					<Link
						className="w-full"
						key={parentPost.id}
						to={`/post/${parentPost.id}`}
					>
						<PostContent
							content={parentPost.content}
							maxLines={isCollapsed ? 1 : 100}
							deactivateLinks={true}
						/>
					</Link>
					<button
						className="shrink-0 px-2 text-[30px] opacity-50 sm:text-base"
						title={isCollapsed ? 'Expand' : 'Collapse'}
						onClick={() => setIsCollapsed(!isCollapsed)}
					>
						<Icon name={isCollapsed ? 'plus-circled' : 'minus-circled'} />
					</button>
				</>
			) : (
				<div style={{ cursor: 'pointer' }} className={'italic text-gray-400'}>
					This post was deleted.
				</div>
			)}
		</div>
	)
}
