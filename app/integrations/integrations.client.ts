import hn from '#app/integrations/hn.ts'
import twitter from '#app/integrations/twitter.ts'
import { type Integration } from './common.ts'

export const integrations = [twitter, hn]

export const matchIntegration = (url: string): Integration | undefined => {
	for (const integration of integrations) {
		const id = integration.parseUrl(url)
		if (id !== undefined) {
			return integration
		}
	}
	return undefined
}
