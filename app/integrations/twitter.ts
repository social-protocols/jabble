export function parseUrl(url: string): string | undefined {
	const regex =
		/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/
	const match = regex.exec(url)
	if (match && match[4]) {
		return match[4] // match[4] is the tweet ID
	} else {
		return undefined
	}
}

export default {
	parseUrl: parseUrl,
	siteName: 'Twitter',
}
