import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { json, type DataFunctionArgs } from '@remix-run/node'
// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
import { useLoaderData } from '@remix-run/react'

import invariant from "tiny-invariant"

export async function loader({ params }: DataFunctionArgs) {

	invariant(params.postid, "Missing postid param");

	console.log("Post id is", params.postid)

	const post = await prisma.posts.findFirst({
		select: {
			id: true,
			parent_id: true,
			content: true,
		},
		where: {
			id: parseInt(params.postid),
		},
	})

	if (!post) {
		throw new Response("Not Found", { status: 404 });
	}

	// invariantResponse(post, 'Post not found', { status: 404 })

	return json({ post })
}


export default function Post() {
	const { post } = useLoaderData<typeof loader>();

	return (
		<div id="post">
			This is a post:
			{post.content}
		</div>
	);
}


export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No user with the username "{params.username}" exists</p>
				),
			}}
		/>
	)
}
