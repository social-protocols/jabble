// import { createPost } from '#app/post.ts'
import {
	type ActionFunctionArgs,
	// type DataFunctionArgs,
	json,
} from '@remix-run/node'

// import {
// Link,
// type ShouldRevalidateFunction,
// useLoaderData,
// } from '@remix-run/react'
// import assert from 'assert';
// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
// import { db } from "#app/db.ts";
// import { topNote, voteRate } from '#app/probabilities.ts';
// import Markdown from 'markdown-to-jsx'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { createPost } from '#app/post.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
// import { Button } from '#app/components/ui/button.tsx';
// import { Link } from '@remix-run/react';

// import { logPostPageView } from '#app/attention.ts'
// import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
// import { PostDetails } from '#app/components/ui/post.tsx'
// import { type Post } from '#app/db/types.ts'

// import type { LinksFunction } from "@remix-run/node"; // or cloudflare/deno

// import { getRankedNotes } from '#app/ranking.ts'
// import { getUserId, requireUserId } from '#app/utils/auth.server.ts'
// import { invariantResponse } from '#app/utils/misc.tsx'

// import { Direction } from '#app/vote.ts'
// const GLOBAL_TAG = "global";

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()
const contentSchema = z.coerce.string()

const replySchema = zfd.formData({
	parentId: postIdSchema,
	tag: tagSchema,
	content: contentSchema,
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const formData = await request.formData()

	const userId: string = await requireUserId(request)

	const parsedData = replySchema.parse(formData)

	console.log('Reply action', parsedData)

	const content = parsedData.content
	const parentId = parsedData.parentId
	const tag = parsedData.tag

	invariant(content, 'content !== undefined')
	invariant(tag, "tag !== ''")

	let newPostId = await createPost(tag, parentId, content, userId)

	console.log('New post id', newPostId)

	return json({ newPostId: newPostId })
}
