// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import type {
	ActionFunctionArgs,
} from "@remix-run/node";
import { json, type DataFunctionArgs } from '@remix-run/node';

import assert from 'assert';
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

import { LocationType, logPostPageView, type Location } from "#app/attention.ts";
import { getRankedNotes } from "#app/ranking.ts";

import { createPost } from '#app/post.ts';
import { Direction, vote } from "#app/vote.ts";

import type { LinksFunction } from "@remix-run/node"; // or cloudflare/deno

// const GLOBAL_TAG = "global";



const postIdSchema = z.coerce.number()
const noteIdSchema = z.coerce.number().optional()
const tagSchema = z.coerce.string()
const contentSchema = z.coerce.string()

// little hack described here: https://stackoverflow.com/questions/76797356/zod-nativeenum-type-checks-enums-value
const directionKeys = Object.keys(Direction) as [keyof typeof Direction]
const directionSchema = z.enum(directionKeys)


export const handle = {
  scripts: () => [{ src: '/js/vote.js' }]
}


function parseDirection(directionString: FormDataEntryValue | undefined): Direction {
	const d: string = directionSchema.parse(directionString)
	console.log("Parsing string", d)

	// if d is a (possibly negative) integer
	if (/^-?\d+$/.test(d)) {
		// parse it as an int
		const i = parseInt(d)
		return i
	}

	// @ts-ignore: typescript doesn't know directionString is guaranteed to overlap with Direction
	return Direction[d]
}

const locationTypeKeys = Object.keys(LocationType) as [keyof typeof LocationType]
const randomLocationTypeSchema = z.enum(locationTypeKeys).optional()

const oneBasedRankSchema = z.coerce.number().optional()


function parseLocationType(locationTypeString: string): LocationType {

	console.log("In parseLocationType", locationTypeString)
	const d: string | undefined = randomLocationTypeSchema.parse(locationTypeString)
	assert(d !== undefined, `unrecognized location type {locationTypeString}`)

	// if d is a (possibly negative) integer
	if (/^-?\d+$/.test(d)) {
		// parse it as an int
		const i = parseInt(d)
		return i
	}

	// @ts-ignore: typescript doesn't know directionString is guaranteed to overlap with Direction
	return LocationType[d]
}


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


// https://github.com/remix-run/remix/discussions/3138
// Single action function that routes the action dependin on the hidden _action field in the form
export const action = async (args: ActionFunctionArgs) => {


	let request = args.request
	const formData = await request.formData();
	let action = formData.get("_action")

	console.log("In action", action)

	invariant(action, 'Missing _action param')

	switch (action) {
		case "reply":
			return await replyAction(args, formData)
		case "vote":
			return await voteAction(args, formData)
	}

}

const voteSchema = zfd.formData({
	postId: postIdSchema,
	noteId: noteIdSchema,
	tag: tagSchema,
	direction: directionSchema,
	state: directionSchema,
	randomLocationType: randomLocationTypeSchema,
	oneBasedRank: oneBasedRankSchema,
});


async function voteAction({
	request,
}: ActionFunctionArgs, formData: FormData) {

	const parsedData = voteSchema.parse(formData);
	const direction: Direction = parseDirection(parsedData.direction)
	const state: Direction = parseDirection(parsedData.state)

	// First, interpret the user intent based on the button pressed **and** the current state.
	const newState = direction == state ? Direction.Neutral : direction

	const userId: string = await requireUserId(request)

	let location: Location | null = null

	console.log("Parsed data", parsedData)


	if (parsedData.randomLocationType !== undefined) {

		let oneBasedRank: number | null = parsedData.oneBasedRank === undefined ? null : parsedData.oneBasedRank 
		assert(oneBasedRank !== null, "oneBasedRank !== null")

		let locationTypeString = parsedData.randomLocationType
		console.log("Random locaiton type strinng", locationTypeString)
		location = {
			locationType: parseLocationType(locationTypeString),
			oneBasedRank: oneBasedRank,
		}
		console.log("Got location in vote action", parsedData.randomLocationType, parsedData.oneBasedRank, location)
	}

	const noteId = parsedData.noteId === undefined ? null : parsedData.noteId

	await vote(
		parsedData.tag,
		userId,
		parsedData.postId,
		noteId,
		newState,
		location,
	)

	return "vote action result"
	// return updateContact(params.contactId, {
	//   favorite: formData.get("favorite") === "true",
	// });
};


const replySchema = zfd.formData({
	postId: postIdSchema,
	tag: tagSchema,
	content: contentSchema,
});


async function replyAction({
	// params,
	request,
}: ActionFunctionArgs, formData: FormData) {

	const userId: string = await requireUserId(request)

	// const d = Object.fromEntries(formData);
	const parsedData = replySchema.parse(formData);
	const content = parsedData.content
	const postId = parsedData.postId
	const tag = parsedData.tag


	// console.log("Creating post", tag, postId, content, userId)
	let newPostId = await createPost(tag, postId, content, userId)

	console.log("New post id", newPostId)

	return json({ newPostId: newPostId });
};



export default function Post() {
	const { post, replies, tag } = useLoaderData<typeof loader>()
	let topNote: Post | null = replies.length > 0 ? replies[0]! : null

	return (
		<div>
			<PostDetails tag={tag} post={post} note={topNote} teaser={false} randomLocation={null} />
			<PostReplies tag={tag} replies={replies} />
		</div>
	)
}


export function PostReplies({ tag, replies }: { tag: string, replies: Post[] }) {
	return (
		<ol>
			{
				replies.map((post: Post) => {
					// let randomLocation = {locationType: LocationType.PostReplies, oneBasedRank: i + 1}
					return (
						<li key={post.id}>
							<PostDetails tag={tag} post={post} note={null} teaser={true} randomLocation={null} />
						</li>
					)
				})
			}
		</ol>
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


