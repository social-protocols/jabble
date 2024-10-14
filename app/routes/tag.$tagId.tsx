import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { Markdown } from '#app/components/markdown.tsx'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '#app/components/ui/tabs.tsx'
import { db } from '#app/db.ts'
import { getPostsAndPollsByTagId } from '#app/modules/posts/post-service.ts'
import { type PollPagePost, type Post } from '#app/modules/posts/post-types.ts'
import { getTagById } from '#app/modules/tags/tag-repository.ts'
import { type Tag } from '#app/modules/tags/tag-types.ts'

const tagIdSchema = z.coerce.number()

export async function loader({ params }: LoaderFunctionArgs) {
	const tagId = tagIdSchema.parse(params.tagId)
	const {
		tag,
		posts,
		polls,
	}: {
		tag: Tag
		posts: Post[]
		polls: PollPagePost[]
	} = await db.transaction().execute(async trx => {
		const tag = await getTagById(trx, tagId)
		const { posts, polls } = await getPostsAndPollsByTagId(trx, tag.id)
		return {
			tag: tag,
			posts: posts,
			polls: polls,
		}
	})

	return json({ tag, posts, polls })
}

export default function TagPage() {
	const { tag, posts, polls } = useLoaderData<typeof loader>()

	return (
		<>
			<div className="mb-6">
				<Markdown deactivateLinks={false}>{`# # ${tag.tag}`}</Markdown>
			</div>
			<div>
				<Tabs defaultValue="polls" className="w-full">
					<TabsList className="my-4 w-full">
						<TabsTrigger value="polls" className="w-full">
							Polls
						</TabsTrigger>
						<TabsTrigger value="posts" className="w-full">
							Posts
						</TabsTrigger>
					</TabsList>
					<TabsContent value="polls">
						<div>
							{polls.map(poll => {
								return (
									<div key={`post-${poll.id}`} className="mb-4">
										{poll.content}
									</div>
								)
							})}
						</div>
					</TabsContent>
					<TabsContent value="posts">
						<div className="mt-5">
							{posts.map(post => {
								return (
									<div key={`post-${post.id}`} className="mb-4">
										{post.content}
									</div>
								)
							})}
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</>
	)
}
