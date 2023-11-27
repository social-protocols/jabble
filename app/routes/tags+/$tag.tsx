// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import { json, type DataFunctionArgs } from '@remix-run/node'
// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
import { useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { Location, logPageView } from "#app/attention.ts"
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

import { db, getPost } from "#app/db.ts"
import { topNote, voteRate } from '#app/probabilities.ts'

import { getRankedPosts } from "#app/ranking.ts"
import { invariantResponse } from '#app/utils/misc.tsx'


const GLOBAL_TAG = "global";

const tagSchema = z.coerce.string()


export async function loader({ params }: DataFunctionArgs) {
	const tag: string = tagSchema.parse(params.tag)

	invariant(tag, 'Missing tag param')


	const posts = await getRankedPosts(tag)
	let userId = "100"
	logPageView(userId, tag, posts)

	return json({ posts })
}

export default function TagPage() {
	const { posts } = useLoaderData<typeof loader>()

	return posts.map(post => 
			<div>
			<div>This is a post: {post.content}</div>
		</div>
	)

}