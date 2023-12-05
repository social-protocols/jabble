// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import type {
	ActionFunctionArgs,
} from "@remix-run/node";
import { json, type DataFunctionArgs } from '@remix-run/node';

// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx';
import { PostDetails } from '#app/components/ui/post.tsx';
// import { db } from "#app/db.ts";
import { getPost } from "#app/post.ts";
// import { topNote, voteRate } from '#app/probabilities.ts';
import { invariantResponse } from '#app/utils/misc.tsx';
import { useLoaderData } from '@remix-run/react';
import invariant from 'tiny-invariant';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
// import { Button } from '#app/components/ui/button.tsx';
import { type Post } from '#app/db/types.ts';
import { getUserId, requireUserId } from '#app/utils/auth.server.ts';
// import { Link } from '@remix-run/react';

import { logPostPageView } from "#app/attention.ts";
import { getRankedNotes } from "#app/ranking.ts";

import { createPost } from '#app/post.ts';

// const GLOBAL_TAG = "global";

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()
const contentSchema = z.coerce.string()

// const replySchema = z.object({
// 	content: zfd.text(z.string()),
// })


export async function loader({ params, request }: DataFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	invariant(params.tag, 'Missing tag param')
	const postId: number = postIdSchema.parse(params.postId)
	const tag: string = tagSchema.parse(params.tag)

	const userId: string | null = await getUserId(request)
	const post = await getPost(postId)

	invariantResponse(post, 'Post not found', { status: 404 })

	let replies = await getRankedNotes(tag, post.id)
	await logPostPageView(tag, post.id, userId)

	return json({ post, replies, tag, userId })
}





export const action = async ({
	params,
	request,
}: ActionFunctionArgs) => {

	const postId: number = postIdSchema.parse(params.postId)
	const tag: string = tagSchema.parse(params.tag)

	const userId: string = await requireUserId(request)

	console.log('userId', userId)
	console.log('parentId', postId)
	console.log('tag', tag)


	const formData = await request.formData()
	const d = Object.fromEntries(formData);

	const content: string = contentSchema.parse(d.content)

	// const actionData = useActionData<typeof action>();

	// console.log("Body is", body)
	// console.log("Action data is ", actionData)
	console.log("content", content)

	console.log("Creating post", tag, postId, content, userId)
	let newPostId = await createPost(tag, postId, content, userId)

	console.log("New post id", newPostId)

	// const name = body.get("visitorsName");
	return json({ newPostId: newPostId });

	// invariant(params.contactId, "Missing contactId param");
	// const formData = await request.formData();
	// const updates = Object.fromEntries(formData);
	// await updateContact(params.contactId, updates);
	// return redirect(`/contacts/${params.contactId}`);
};



export default function Post() {
	const { post, replies, tag } = useLoaderData<typeof loader>()
	let topNote: Post | null = replies.length > 0 ? replies[0]! : null

	return (
		<div>
			<PostDetails tag={tag} post={post} note={topNote} teaser={false} />
			<PostReplies tag={tag} replies={replies} />
		</div>
	)
}


export function PostReplies({ tag, replies }: { tag: string, replies: Post[] }) {
	return replies.map((post: Post) => 
		<PostDetails tag={tag} post={post} note={null} teaser={true} />
	)
}


export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				// 404: ({ params }) => <p>Post not found</p>,
				404: () => <p>Post not found</p>,
			}}
		/>
	)
}


