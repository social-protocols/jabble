import hn from '#app/integrations/hn.server.ts'
import { type ServerIntegration } from '#app/integrations/integrations.common.ts'
import twitter from '#app/integrations/twitter.server.ts'

export const integrations: ServerIntegration[] = [twitter, hn]

export const matchIntegration = (
	url: string,
): { integration: ServerIntegration; id: string } | undefined => {
	for (const integration of integrations) {
		console.log('Have integration', integration)
		const id = integration.parseUrl(url)
		if (id !== undefined) {
			return { integration, id }
		}
	}
	return undefined
}
