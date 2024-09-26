import { decode } from 'html-entities'
import { type Transaction } from 'kysely'
import TurndownService from 'turndown'
import { createPost, getRootPostId } from '#app/repositories/post.ts'
import { type DB } from '#app/types/kysely-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { getHackerNewsTree } from './hacker-news-client.ts'
import {
	getHNIdForPostId,
	getPostIdForHNItem,
} from './hacker-news-repository.ts'
import { type AlgoliaHackerNewsTree } from './hacker-news-types.ts'

const HN_USER_ID = 'ea4e6cf6-afba-4f14-9040-00d5457e827f'

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
