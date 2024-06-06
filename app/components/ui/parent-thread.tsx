import { Link } from '@remix-run/react'
import { type Post } from '#app/db/types.ts'
import { PostContent } from './post.tsx'

export function ParentThread({
	transitiveParents,
}: {
	transitiveParents: Post[]
}) {
	return (
		<div className="ml-1 border-l-4 border-solid border-post">
			{transitiveParents.map(parentPost => (
				<Link key={parentPost.id} to={`/post/${parentPost.id}`}>
					<div
						key={parentPost.id}
						className="postparent mb-4 ml-4 text-sm text-postparent-foreground"
					>
						{parentPost.deletedAt == null ? (
							<PostContent
								content={parentPost.content}
								maxLines={1}
								deactivateLinks={true}
							/>
						) : (
							<div
								style={{ cursor: 'pointer' }}
								className={'italic text-gray-400'}
							>
								This post was deleted.
							</div>
						)}
					</div>
				</Link>
			))}
		</div>
	)
}
