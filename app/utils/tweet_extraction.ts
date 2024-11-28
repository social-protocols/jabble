import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

export async function extractTweetText(tweetUrl: string): Promise<string> {
	const response = await fetch(tweetUrl, {
		headers: {
			'User-Agent': 'googlebot',
		},
	})

	if (!response.ok) {
		throw new Error(`HTTP error ${response.status}, ${tweetUrl}`)
	}

	const html = await response.text()
	const $ = cheerio.load(html)

	const ogDescription = $('meta[property="og:description"]').attr('content')

	if (!ogDescription) {
		throw new Error(`Could not extract tweet from html. ${html}`)
	}
	return ogDescription
}
