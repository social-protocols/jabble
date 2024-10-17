import createError from 'http-errors'
import sanitizeHtml from 'sanitize-html'
import invariant from 'tiny-invariant'
import hn from './hn.ts'
import {
	type ServerIntegration,
	type OEmbedResponse,
	errorResponse,
} from './integrations.common.ts'

interface HackerNewsItem {
	by?: string
	id?: number
	kids?: number[]
	parent?: number
	text?: string
	time?: number
	type?: string
	title?: string // For story items
	url?: string
	[key: string]: any
}

// Utility function to get relative time
function timeAgo(timestamp: number): string {
	const now = Date.now()
	const secondsPast = (now - timestamp * 1000) / 1000

	if (secondsPast < 60) {
		return `${Math.floor(secondsPast)} seconds ago`
	}
	if (secondsPast < 3600) {
		return `${Math.floor(secondsPast / 60)} minutes ago`
	}
	if (secondsPast < 86400) {
		return `${Math.floor(secondsPast / 3600)} hours ago`
	}
	if (secondsPast < 2592000) {
		return `${Math.floor(secondsPast / 86400)} days ago`
	}
	if (secondsPast < 31104000) {
		return `${Math.floor(secondsPast / 2592000)} months ago`
	}
	return `${Math.floor(secondsPast / 31104000)} years ago`
}

async function getCommentThread(
	itemId: number,
): Promise<{ thread: HackerNewsItem[]; storyId: number; isStory: boolean }> {
	const thread: HackerNewsItem[] = []
	let currentId = itemId
	let storyId = 0
	let isStory = false

	while (true) {
		const response = await fetch(
			`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`,
		)
		if (!response.ok) {
			console.log('Response', response)
			throw createError(response.status, response.statusText)
		}
		const data = (await response.json()) as HackerNewsItem

		console.log('Data', data)

		// Firebase API returns null instead of not found
		if (data == null) {
			throw createError(404, `Item ID ${itemId} not found`)
			// return errorResponse(404, 'Item not found');
		}

		thread.unshift(data) // Add to the beginning to build from root to leaf

		if (data.type === 'story') {
			storyId = data.id || 0
			if (data.id === itemId) {
				isStory = true
			}
			break
		}

		if (!data.parent) {
			break
		}

		currentId = data.parent
	}

	if (storyId === 0 && thread.length > 0) {
		const firstItem = thread[0]
		invariant(firstItem !== undefined, 'First item in thread is undefined')
		// If storyId is not set, use the parent of the first item
		if (firstItem.parent) {
			storyId = firstItem.parent
		}
	}

	return { thread, storyId, isStory }
}

function generateStoryHTML(story: HackerNewsItem): string {
	const title = sanitizeHtml(story.title || '')
	const url = story.url || ''
	const author = story.by || '[deleted]'
	const time = story.time ? timeAgo(story.time) : ''
	const score = story.score || 0
	const descendants = story.descendants || 0
	const storyId = story.id || ''

	// Extract domain from URL
	let domain = ''
	if (url) {
		try {
			const parsedUrl = new URL(url)
			domain = parsedUrl.hostname.replace('www.', '')
		} catch (e) {
			// Ignore URL parsing errors
		}
	}

	const storyUrl = `https://news.ycombinator.com/item?id=${storyId}`

	// Generate HTML
	const html = `
	<div class="hn-story">
		<div class="hn-story-title">
			<a href="${url || storyUrl}" target="_blank" rel="noopener noreferrer">${title}</a>
			${domain ? `<span class="hn-story-domain">(${domain})</span>` : ''}
		</div>
		<div class="hn-story-meta">
			<span>${score} points</span>
			<span>by ${author}</span>
			<span>${time}</span>
			<span>| ${descendants} comments</span>
		</div>
	</div>
	`

	return html
}

function generateThreadHTML(
	thread: HackerNewsItem[],
	requestedItemId: number,
): string {
	let html = ''

	thread.forEach((comment, index) => {
		// Handle the story differently
		if (index === 0 && comment.type === 'story') {
			html += generateStoryHTML(comment)
			return
		}

		const sanitizedText = sanitizeHtml(comment.text || '', {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
			allowedAttributes: {
				a: ['href', 'name', 'target'],
				img: ['src'],
				'*': ['class'],
			},
		})

		const relativeTime = comment.time ? timeAgo(comment.time) : ''

		const indent = index * 20 // Adjust indentation per level

		const author = comment.by || '[deleted]'
		const commentId = comment.id || ''
		const commentUrl = `https://news.ycombinator.com/item?id=${commentId}`

		const isRequestedComment = comment.id === requestedItemId

		html += `
			<div class="hn-comment-level" style="margin-left: ${indent}px;">
				<a href="${commentUrl}" target="_blank" rel="noopener noreferrer" class="hn-comment-link">
					<div class="hn-comment ${isRequestedComment ? 'hn-comment-highlight' : ''}" style="font-size: ${isRequestedComment ? '11pt' : '9pt'};">
						<div class="hn-comment-header">
							<span class="hn-comment-author">${author}</span>
							<span class="hn-comment-time">${relativeTime}</span>
						</div>
						<div class="hn-comment-text">${sanitizedText}</div>
					</div>
				</a>
			</div>
		`
	})

	return html
}

const oEmbed = async (_request: Request, id: string) => {
	const itemId = parseInt(id)
	try {
		// Get the comment thread and story ID
		const { thread, isStory } = await getCommentThread(itemId)

		if (thread.length === 0) {
			return errorResponse(404, 'Item not found')
		}
		invariant(thread[thread.length - 1] !== undefined, 'thread is empty')
		const lastComment: HackerNewsItem = thread[
			thread.length - 1
		] as HackerNewsItem

		let htmlContent: string

		if (isStory) {
			// Generate HTML for the story
			const story = thread[0]
			invariant(story !== undefined, 'Story is undefined')
			htmlContent = generateStoryHTML(story)
		} else {
			// Generate HTML for the thread
			htmlContent = generateThreadHTML(thread, itemId)
		}

		// Wrap the entire content in the main container
		const html = `
		<style>
		/* Updated CSS */

		/* Set background color for the main container */
		.hn-comment-thread {
			position: relative;
			font-family: Verdana, Geneva, sans-serif;
			font-size: 10pt;
			line-height: 1.4em;
			border: 1px solid #e6e6e6;
			border-radius: 8px;
			padding: 10px;
			background-color: #f6f6ef; /* Hacker News grayish background color */
		}

		.hn-comment-level {
			margin-bottom: 2px; /* Reduced margin between comments */
		}

		.hn-comment {
			position: relative;
			padding: 5px;
		}

		.hn-comment-header {
			margin-bottom: 1px; /* Reduced margin between comment header and text */
		}

		.hn-comment-author {
			color: #828282;
		}

		.hn-comment-time {
			color: #828282;
			margin-left: 5px;
			font-size: 8pt;
		}

		.hn-comment-text {
			margin-top: 1px;
		}

		.hn-logo {
			position: absolute;
			top: 10px;
			right: 10px;
		}

		.hn-logo img {
			width: 20px;
			height: 20px;
		}

		.hn-comment-link {
			text-decoration: none;
			color: inherit;
		}

		.hn-comment-link:hover {
			text-decoration: none;
		}

		.hn-comment-highlight {
			border: 1px solid black;
			border-radius: 5px;
			font-size: 11pt;
		}

		.hn-story {
			margin-bottom: 10px; /* Reduced margin between story and comments */
		}

		.hn-story-title {
			font-size: 12pt; /* Reduced font size */
			font-weight: normal; /* Removed bold */
			margin-bottom: 2px; /* Less margin between title and meta */
		}

		.hn-story-title a {
			text-decoration: none;
			color: #000;
		}

		.hn-story-domain {
			font-size: 10pt;
			color: #828282;
			margin-left: 5px;
		}

		.hn-story-meta {
			font-size: 8pt;
			color: #828282;
			margin-top: 2px; /* Reduced margin between title and meta */
		}

		.hn-story-meta span {
			margin-right: 10px;
		}
		</style>

		<div class="hn-comment-thread">
		${htmlContent}
		</div>
		`

		// Build the oEmbed response
		const oEmbedResponse: OEmbedResponse = {
			version: '1.0',
			type: 'rich',
			html: html,
			width: 600,
			height: null,
			author_name: lastComment.by || '[deleted]',
			provider_name: 'Hacker News',
			provider_url: 'https://news.ycombinator.com',
			cache_age: '86400', // Cache for one day
		}

		return new Response(JSON.stringify(oEmbedResponse), {
			status: 200,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
			},
		})
	} catch (error) {
		console.error('Error fetching Hacker News item:', error)
		if (createError.isHttpError(error)) {
			return errorResponse(404, error.message)
		}
		return errorResponse(500, 'Internal Server Error')
	}
}

async function extractContent(itemId: string): Promise<string> {
	const response = await fetch(
		`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`,
	)
	if (!response.ok) {
		console.log('Response', response)
		throw createError(response.status, response.statusText)
	}
	const data = (await response.json()) as HackerNewsItem

	console.log('Data', data)

	// Firebase API returns null instead of not found
	if (data == null) {
		throw createError(404, `Item ID ${itemId} not found`)
		// return errorResponse(404, 'Item not found');
	}

	if (data.type === 'story') {
		return `${data.title} (${data.url})\n\n ${data.text || ''}`
	}

	if (data.text === undefined) {
		throw new Error('Failed to get item text')
	}
	return data.text
}

var integration: ServerIntegration = {
	parseUrl: hn.parseUrl,
	siteName: hn.siteName,
	oEmbed: oEmbed,
	extractContent: extractContent,
}

export default integration
