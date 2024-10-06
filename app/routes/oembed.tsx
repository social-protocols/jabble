import { json, type LoaderFunction } from '@remix-run/node'

export const loader: LoaderFunction = async ({ request }) => {
	const url = new URL(request.url).searchParams.get('url')
	if (!url) {
		return json({ error: 'Missing url parameter' }, { status: 400 })
	}

	const apiUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(
		url,
	)}`
	try {
		const response = await fetch(apiUrl)

		if (!response.ok) {
			if (response.status === 404) {
				return json({ error: 'Tweet not found' }, { status: 404 })
			} else {
				throw new Error('Failed to fetch oEmbed data')
			}
		}

		const data = await response.json()
		return json(data)
	} catch (error: any) {
		return json({ error: error.message }, { status: 500 })
	}
}
