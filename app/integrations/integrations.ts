import hn from '#app/integrations/hn.ts'
import twitter from '#app/integrations/twitter.ts'
import { type ClientIntegration } from './integrations.common.ts'

export const integrations = [twitter, hn]

export const matchIntegration = (
	url: string,
): ClientIntegration | undefined => {
	for (const integration of integrations) {
		const id = integration.parseUrl(url)
		if (id !== undefined) {
			return integration
		}
	}
	return undefined
}
