import * as https from 'https'
import { decode } from 'html-entities'
import { type Transaction } from 'kysely'
import TurndownService from 'turndown'
import { z } from 'zod'
import { type DB } from '#app/types/kysely-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { createPost, getRootPostId } from './post.ts'

const HN_USER_ID = 'ea4e6cf6-afba-4f14-9040-00d5457e827f'

const baseAlgoliaHackerNewsTreeSchema = z.object({
	author: z.coerce.string(),
	created_at_i: z.coerce.number(),
	id: z.coerce.number(),
	parent_id: z.coerce.number().nullable(),
	story_id: z.coerce.number(),
	text: z.coerce.string().nullable(),
	title: z.coerce.string().nullable(),
	type: z.coerce.string(),
	url: z.coerce.string().nullable(),
})

type AlgoliaHackerNewsTree = z.infer<typeof baseAlgoliaHackerNewsTreeSchema> & {
	children: AlgoliaHackerNewsTree[]
}

const algoliaHackerNewsTreeSchema: z.ZodType<AlgoliaHackerNewsTree> =
	baseAlgoliaHackerNewsTreeSchema.extend({
		children: z.lazy(() => algoliaHackerNewsTreeSchema.array()),
	})

export async function syncWithHN(
	trx: Transaction<DB>,
	hnId: number,
): Promise<number> {
	const tree = await getHackerNewsTree(hnId)
	invariant(
		tree.type === 'story',
		`HN item must be a story, got ${hnId} of type ${tree.type}`,
	)
	return await createMissingPosts(trx, tree, null, HN_USER_ID)
}

export async function updateHN(trx: Transaction<DB>, postId: number) {
	const rootPostId = await getRootPostId(trx, postId)
	const hnId = await getHNIdForPostId(trx, rootPostId)
	if (hnId !== undefined) {
		await syncWithHN(trx, hnId)
	}
}

async function getHackerNewsTree(hnId: number): Promise<AlgoliaHackerNewsTree> {
	console.log(`Importing new replies for ${hnId} from Hacker News...`)

	const hnUrl = `https://hn.algolia.com/api/v1/items/${hnId}`

	const result: AlgoliaHackerNewsTree =
		await new Promise<AlgoliaHackerNewsTree>((resolve, reject) => {
			https
				.get(hnUrl, res => {
					let data = ''

					res.on('data', chunk => {
						data += chunk
					})

					res.on('end', () => {
						try {
							const item = algoliaHackerNewsTreeSchema.parse(JSON.parse(data))
							resolve(item)
						} catch (e) {
							reject(e)
						}
					})
				})
				.on('error', e => reject(e))
		})

	return result
}

const turndownService = new TurndownService()
// Disable markdown escaping
turndownService.escape = str => str
// Some newlines are swallowed when converting HTML to markdown, so we need to encode them
const newlineEncoding = '💀NEWLINE🎃'

async function createMissingPosts(
	trx: Transaction<DB>,
	algoliaHackerNewsTree: AlgoliaHackerNewsTree,
	parentId: number | null,
	authorId: string,
): Promise<number> {
	let postId = await getPostIdForHNItem(trx, algoliaHackerNewsTree.id)

	if (postId === undefined) {
		const titleLink = algoliaHackerNewsTree.url
			? `<a href="${algoliaHackerNewsTree.url}">${algoliaHackerNewsTree.title}</a>`
			: algoliaHackerNewsTree.title || ''
		const contentRaw = (
			titleLink +
			'\n\n' +
			(algoliaHackerNewsTree.text || '')
		).trim()
		const decodedContent = decode(contentRaw)
		const newlineEncodedContent = decodedContent.replaceAll(
			'\n',
			newlineEncoding,
		)
		const htmlToMarkdownContent = turndownService.turndown(
			newlineEncodedContent,
		)
		const content = htmlToMarkdownContent.replaceAll(newlineEncoding, '\n')
		postId = await createPost(trx, parentId, content, authorId, {
			isPrivate: false,
			withUpvote: false,
			createdAt: algoliaHackerNewsTree.created_at_i * 1000,
		})
		console.log(`Created post ${postId} for hnId ${algoliaHackerNewsTree.id}`)

		await trx
			.insertInto('HNItem')
			.values({
				hnId: algoliaHackerNewsTree.id,
				postId,
			})
			.execute()
	}

	await Promise.all(
		algoliaHackerNewsTree.children.map(async child => {
			await createMissingPosts(trx, child, postId, authorId)
		}),
	)

	return postId
}

async function getPostIdForHNItem(
	trx: Transaction<DB>,
	hnId: number,
): Promise<number | undefined> {
	const result = await trx
		.selectFrom('HNItem')
		.where('hnId', '=', hnId)
		.select('postId')
		.executeTakeFirst()
	return result?.postId
}

async function getHNIdForPostId(
	trx: Transaction<DB>,
	postId: number,
): Promise<number | undefined> {
	const result = await trx
		.selectFrom('HNItem')
		.where('postId', '=', postId)
		.select('hnId')
		.executeTakeFirst()
	return result?.hnId
}
