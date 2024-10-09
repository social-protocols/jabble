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
