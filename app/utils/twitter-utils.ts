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
