// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import { type DataFunctionArgs, json } from '@remix-run/node'
// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
import { useLoaderData } from '@remix-run/react'

import invariant from 'tiny-invariant'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'

const postIdSchema = z.coerce.number()

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	const postId: number = postIdSchema.parse(params.postId)

	const post = await prisma.posts.findFirst({
		select: {
			id: true,
			parent_id: true,
			content: true,
		},
		where: {
			id: postId,
		},
	})

	invariantResponse(post, 'Post not found', { status: 404 })

	return json({ post })
}

export default function Post() {
	const { post } = useLoaderData<typeof loader>()

	return <div>{post.content}</div>
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => <p>Post not found</p>,
			}}
		/>
	)
}
