export interface Integration {
	parseUrl(url: string): string | undefined
	oEmbed(request: Request, id: string): Promise<Response>
	extractContent(id: string): Promise<string>
	siteName: string
}

export interface OEmbedResponse {
	version: string
	type: string
	html: string
	width?: number | null
	height?: number | null
	title?: string
	author_name?: string
	author_url?: string
	provider_name?: string
	provider_url?: string
	cache_age?: string
	thumbnail_url?: string
	thumbnail_width?: number
	thumbnail_height?: number
}

export function errorResponse(httpStatusCode: number, message: string) {
	const errorResponse = {
		errors: [
			{
				message: message,
			},
		],
	}

	return new Response(JSON.stringify(errorResponse), {
		status: httpStatusCode,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-cache, no-store, max-age=0',
		},
	})
}
