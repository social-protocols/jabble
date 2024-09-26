import * as https from 'https'
import {
	type AlgoliaHackerNewsTree,
	algoliaHackerNewsTreeSchema,
} from './hacker-news-types.ts'

export async function getHackerNewsTree(
	hnId: number,
): Promise<AlgoliaHackerNewsTree> {
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
