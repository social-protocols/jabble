import { type LoaderFunction } from '@remix-run/node'

export const loader: LoaderFunction = async ({ request }) => {
	const apiUrl = `https://publish.twitter.com/oembed${new URL(request.url).search}`

	try {
		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'User-Agent': request.headers.get('User-Agent') || 'Jabble/1.0',
			},
		})

		// Return Twitter's response directly
		return new Response(response.body, {
			status: response.status,
			headers: response.headers,
		})
	} catch (error: any) {
		console.error('Error fetching from Twitter API:', error)

		const errorResponse = {
			error: 'Bad Gateway',
			message:
				'The proxy server received an invalid response from the upstream server.',
		}

		return new Response(JSON.stringify(errorResponse), {
			status: 502,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Cache-Control': 'no-cache, no-store, max-age=0',
			},
		})
	}
}
