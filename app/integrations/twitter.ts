import { type RefObject } from 'react'

declare global {
	interface Window {
		twttr?: {
			widgets: {
				load: () => void
			}
		}
	}
}

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

export function loadContent(
	embedContainerRef: RefObject<HTMLDivElement>,
	onLoad: () => void,
) {
	const loadTwitterScript = () => {
		if (window.twttr && window.twttr.widgets) {
			window.twttr.widgets.load()
		} else {
			const script = document.createElement('script')
			script.src = 'https://platform.twitter.com/widgets.js'
			script.async = true
			script.onload = () => {
				if (window.twttr && window.twttr.widgets) {
					window.twttr.widgets.load()
				}
			}
			document.body.appendChild(script)
		}
	}
	loadTwitterScript()

	const checkTweetLoaded = () => {
		const embedContainer = embedContainerRef.current
		if (!embedContainer) return

		// Check if the tweet iframe is loaded
		const iframe = embedContainer.querySelector('iframe')
		if (iframe) {
			iframe.addEventListener('load', () => {
				onLoad()
			})
		} else {
			// If iframe is not found immediately, observe for its addition
			const observer = new MutationObserver(() => {
				const iframe = embedContainer.querySelector('iframe')
				if (iframe) {
					iframe.addEventListener('load', () => {
						onLoad()
					})
					observer.disconnect()
				}
			})
			observer.observe(embedContainer, { childList: true, subtree: true })
		}
	}

	checkTweetLoaded()
}

export default {
	parseUrl: parseUrl,
	siteName: 'Twitter',
	loadContent: loadContent,
}
