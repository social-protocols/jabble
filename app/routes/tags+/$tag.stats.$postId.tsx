import { type DataFunctionArgs, json } from '@remix-run/node'

import { useLoaderData } from '@remix-run/react'

import invariant from 'tiny-invariant'
import { z } from 'zod'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import {
	type ScoredPost,
	getScoredPost,
} from '#app/ranking.ts'
import { PostContent } from '#app/components/ui/post.tsx'
import { StatsPostAnnotation, StatsInformedRatioChange, EffectStrengthConnectorLine } from '#app/components/ui/post-stats.tsx'
import { Card } from '#app/components/ui/card.tsx'

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	invariant(params.tag, 'Missing tag param')
	const postId: number = postIdSchema.parse(params.postId)
	const tag: string = tagSchema.parse(params.tag)

	const post: ScoredPost = await getScoredPost(tag, postId)

	const parent = post.parentId == null ? null : await getScoredPost(tag, post.parentId)

	const topReply = post.topNoteId == null ? null : await getScoredPost(tag, post.topNoteId)

	// TODO: Is this comment still relevant?
	// So the first of the replies and the top note are not necessarily the same thing?!?
	// The top note is the most convincing one. But the replies are ordered by *information rate*.

	let result = json({
		post,
		parent,
		topReply,
		tag,
	})

	return result
}

export default function PostStats() {
	const { post, parent, topReply, tag } = useLoaderData<typeof loader>()

	const headerMarkdown = `
		# Stats for post [${post.id}](/tags/${tag}/posts/${post.id}) in [#${tag}](/tags/${tag})
	`.trim()

	const parentPost =
		parent === null ? <div></div> :
		<Card className={'bg-post'}>
			<StatsPostAnnotation annotation={`Post ${parent.id}`}/>
			<PostContent
				content={parent.content}
				maxLines={3}
				linkTo={`/tags/${tag}/posts/${parent.id}`}
				deactivateLinks={true}
			/>
			<StatsInformedRatioChange
				informedProb={parent.p}
				uninformedProb={parent.q}
			/>
		</Card>

	const targetPost =
		<Card className={'bg-post'}>
			<StatsPostAnnotation annotation={`Post ${post.id}`}/>
			<PostContent
				content={post.content}
				maxLines={3}
				linkTo={`/tags/${tag}/posts/${post.id}`}
				deactivateLinks={true}
			/>
			<StatsInformedRatioChange
				informedProb={post.p}
				uninformedProb={post.q}
			/>
		</Card>

	const topReplyPost =
		topReply === null ? <div></div> :
		<Card className={'bg-post'}>
			<StatsPostAnnotation annotation={`Top reply of post ${post.id}`}/>
			<PostContent
				content={topReply.content}
				maxLines={3}
				linkTo={`/tags/${tag}/posts/${topReply.id}`}
				deactivateLinks={true}
			/>
		</Card>

	return (
		<>
			<div className='markdown mb-5'>
				<Markdown deactivateLinks={false}>{headerMarkdown}</Markdown>
			</div>
			{parentPost}
			{
				parent !== null &&
				<EffectStrengthConnectorLine
					informedProb={parent!.p}
					uninformedProb={parent!.q}
				/>
			}
			{targetPost}
			{
				topReply !== null &&
				<EffectStrengthConnectorLine
					informedProb={post.p}
					uninformedProb={post.q}
				/>
			}
			{topReplyPost}
		</>
	)
}


export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => <p>Post not found</p>,
			}}
		/>
	)
}
