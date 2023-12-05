// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import type {
	ActionFunctionArgs,
} from "@remix-run/node";
import { json, type DataFunctionArgs } from '@remix-run/node';

// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
import { Location } from "#app/attention.ts";
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx';
import { PostDetails } from '#app/components/ui/post.tsx';
import { db } from "#app/db.ts";
import { getPost } from "#app/post.ts";
import { topNote, voteRate } from '#app/probabilities.ts';
import { invariantResponse } from '#app/utils/misc.tsx';
import { useActionData, useLoaderData } from '@remix-run/react';
import invariant from 'tiny-invariant';
import { z } from 'zod';

import { Button } from '#app/components/ui/button.tsx';
import { type Post } from '#app/db/types.ts';
import { Link } from '@remix-run/react';
import { requireUserId } from '#app/utils/auth.server.ts';



const GLOBAL_TAG = "global";

const postIdSchema = z.coerce.number()


export async function loader({ params }: DataFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	const postId: number = postIdSchema.parse(params.postId)

	const post = await getPost(postId)

	invariantResponse(post, 'Post not found', { status: 404 })

	const tag = GLOBAL_TAG;
	const note = await topNote(tag, postId)

	const vr = await voteRate(tag, postId)
	console.log(`Vote rate is ${vr}`)


	const noteId = note != null ? note.id : 0

	// await logImpression(100, tag, postId, Location.POST_PAGE, 0)
	// await logImpression(100, tag, noteId, Location.TOP_NOTE_ON_POST_PAGE, 0)

	return json({ post, note })
}



export const action = async ({
	params,
	request,
}: ActionFunctionArgs) => {

  const userId = await requireUserId(request)
  console.log('userId', userId)


  console.log("User id is ", userId)

	console.log("Params are", params)

	// const body = await request.formData();
	const formData = await request.formData()
	const postDetails = Object.fromEntries(formData);

	// const actionData = useActionData<typeof action>();

	// console.log("Body is", body)
	// console.log("Action data is ", actionData)
	console.log("Form data is ", postDetails)
	console.log("Parent id", postDetails.parentId)

	// const name = body.get("visitorsName");
	return json({ message: `Hey there` });

	// invariant(params.contactId, "Missing contactId param");
	// const formData = await request.formData();
	// const updates = Object.fromEntries(formData);
	// await updateContact(params.contactId, updates);
	// return redirect(`/contacts/${params.contactId}`);
};



export default function Post() {
	const { post, note } = useLoaderData<typeof loader>()
	return <PostDetails post={post} note={note} />
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


