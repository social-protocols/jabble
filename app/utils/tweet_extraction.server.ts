import { Scraper } from '@johnwarden/twitter-scraper'

export async function extractTweetTextGraphQL(
	tweetID: string,
): Promise<string> {
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

export function parseTweetURL(url: string): string | null {
	const regex =
		/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/
	const match = regex.exec(url)
	if (match && match[4]) {
		return match[4] // match[4] is the tweet ID
	} else {
		return null
	}
}

export function isValidTweetUrl(url: string): boolean {
	const regex =
		/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/
	return regex.test(url)
}

