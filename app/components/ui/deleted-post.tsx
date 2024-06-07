import { Form, Link, useNavigate } from '@remix-run/react'
import moment from 'moment'
import { type ScoredPost } from '#app/ranking.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { CommentIcon } from './comment-icon.tsx'

export function DeletedPost({ post }: { post: ScoredPost }) {
	const ageString = moment(post.createdAt).fromNow()

	const navigate = useNavigate()

	const user = useOptionalUser()
	const isAdminUser = user ? user.isAdmin : false

	return (
		<div
			className={
				'mb-5 flex w-full flex-row space-x-4 rounded-lg bg-post px-5 pb-5'
			}
		>
			<div className={'flex w-full min-w-0 flex-col'}>
				<div className="mb-1 mt-2 flex text-sm">
					<span className="ml-auto opacity-50">{ageString}</span>
				</div>

				<div
					style={{ cursor: 'pointer' }}
					className={'italic text-gray-400'}
					onClick={() => `/post/${post.id}` && navigate(`/post/${post.id}`)}
				>
					This post was deleted.
				</div>

				<div className="mt-2 flex w-full text-sm">
					<Link to={`/post/${post.id}`} className="ml-2">
						<CommentIcon needsVote={false} />
					</Link>
					{isAdminUser && (
						<Form id="restore-post-form" method="POST" action="/restorePost">
							<input type="hidden" name="postId" value={post.id} />
							<input type="hidden" name="userId" value={user?.id} />
							<button className="ml-2 rounded bg-green-600 px-1 text-white">
								restore
							</button>
						</Form>
					)}
				</div>
			</div>
		</div>
	)
}
