export function parseUrl(url: string): string | undefined {
	try {
		// Parse the URL
		const parsedUrl = new URL(url)

		// Check if hostname is 'news.ycombinator.com'
		if (parsedUrl.hostname !== 'news.ycombinator.com') {
			return undefined
		}

		// Check if path is '/item'
		if (parsedUrl.pathname !== '/item') {
			return undefined
		}

		// Extract 'id' query parameter
		const id = parsedUrl.searchParams.get('id')
		if (!id) {
			return undefined
		}

		// Parse ID and return
		if (isNaN(parseInt(id, 10))) {
			return undefined
		}
		return id
	} catch (e) {
		// If any error occurs, return undefined
		return undefined
	}
}

export default {
	parseUrl: parseUrl,
	siteName: 'Hacker News',
}
