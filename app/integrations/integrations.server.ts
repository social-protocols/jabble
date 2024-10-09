import { type Integration } from '#app/integrations/common.ts'
import hn from '#app/integrations/hn.server.ts'
import twitter from '#app/integrations/twitter.server.ts'

export const integrations: Integration[] = [twitter, hn]

export const matchIntegration = (
	url: string,
): { integration: Integration; id: string } | undefined => {
	for (const integration of integrations) {
		console.log('Parsing', integration, url)
		const id = integration.parseUrl(url)
		if (id !== undefined) {
			return { integration, id }
		}
	}
	return undefined
}
