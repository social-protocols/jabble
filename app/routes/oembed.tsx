import { type LoaderFunctionArgs, type LoaderFunction } from '@remix-run/node'
import { errorResponse } from '#app/integrations/integrations.common.ts'
import { matchIntegration } from '#app/integrations/integrations.server.ts'

export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {
	const request = args.request
	const url = new URL(request.url).searchParams.get('url')
	if (!url) {
		return errorResponse(400, 'url: queryParam is required')
	}

	// loop through integrations. Call parseURL on the URL. If result is non-null, this URL matches. Call proxyOembed.
	const match = matchIntegration(url)
	if (match !== undefined) {
		return await match.integration.oEmbed(request, match.id)
	}

	// If URL does not match any known patterns
	return errorResponse(400, 'Unsupported URL')
}
