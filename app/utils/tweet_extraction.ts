import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

async function extractTweetText(tweetUrl: string): Promise<string | null> {
	try {
		const response = await fetch(tweetUrl, {
			headers: {
				'User-Agent': 'googlebot',
			},
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const html = await response.text()
		const $ = cheerio.load(html)

		const ogDescription = $('meta[property="og:description"]').attr('content')

		return ogDescription || null
	} catch (error) {
		console.error('Error extracting tweet text:', error)
		return null
	}
}
