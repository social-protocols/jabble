import { Scraper } from '@johnwarden/twitter-scraper'
import fetch from 'node-fetch'
import { type Integration, errorResponse } from './common.ts'
import twitter from './twitter.ts'

const oEmbed = async (request: Request, _id: string) => {
	const apiUrl = `https://publish.twitter.com/oembed${new URL(request.url).search}`

	try {
		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'User-Agent': request.headers.get('User-Agent') || 'YourAppName/1.0',
			},
		})

		const responseBody = await response.text()

		// Return Twitter's response directly
		return new Response(responseBody, {
			status: response.status,
			headers: {
				'Content-Type':
					response.headers.get('Content-Type') ||
					'application/json; charset=utf-8',
			},
		})
	} catch (error: any) {
		console.error('Error fetching from Twitter API:', error)

		return errorResponse(
			502,
			'The proxy server received an invalid response from the upstream server.',
		)
	}
}

export async function extractContent(tweetID: string): Promise<string> {
	const scraper = new Scraper()

	const tweet = await scraper.getTweet(tweetID)

	if (tweet == null) {
		// raise an exception
		throw new Error('Could not extract tweet from html.')
	}
	console.log(tweet)

	if (tweet.text === undefined) {
		throw new Error('Got undefined tweet text from API')
	}

	return tweet.text
}

var integration: Integration = {
	parseUrl: twitter.parseUrl,
	siteName: twitter.siteName,
	oEmbed: oEmbed,
	extractContent: extractContent,
}

export default integration
