import { type LoaderFunctionArgs, type LoaderFunction } from "@remix-run/node";
import fetch from 'node-fetch';
import sanitizeHtml from 'sanitize-html';

export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {

	const request = args.request;

	const url = new URL(request.url).searchParams.get('url');

	if (!url) {
		return errorResponse(400, "url: queryParam is required");
	}

	if (isTweetUrl(url)) {
		return await proxyTwitterOembed(request);
	}

	const hackerNewsId = parseHackerNewsNewsItemUrl(url);
	if (hackerNewsId !== undefined) {
		return await hackerNewsOembed(hackerNewsId);
	}

	// If URL does not match any known patterns
	return errorResponse(400, "Unsupported URL");
};

const proxyTwitterOembed = async (request: Request) => {

	const apiUrl = `https://publish.twitter.com/oembed${new URL(request.url).search}`;

	try {
		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'User-Agent': request.headers.get('User-Agent') || 'YourAppName/1.0',
			},
		});

		const responseBody = await response.text();

		// Return Twitter's response directly
		return new Response(responseBody, {
			status: response.status,
			headers: {
				"Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8",
			},
		});
	} catch (error: any) {
		console.error('Error fetching from Twitter API:', error);

		return errorResponse(502, "The proxy server received an invalid response from the upstream server.");
	}
};

function isTweetUrl(url: string): boolean {
	const regex =
		/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/
	return regex.test(url);
}

function parseHackerNewsNewsItemUrl(url: string): number | undefined {
	try {
		// Parse the URL
		const parsedUrl = new URL(url);

		// Check if hostname is 'news.ycombinator.com'
		if (parsedUrl.hostname !== 'news.ycombinator.com') {
			return undefined;
		}

		// Check if path is '/item'
		if (parsedUrl.pathname !== '/item') {
			return undefined;
		}

		// Extract 'id' query parameter
		const id = parsedUrl.searchParams.get('id');
		if (!id) {
			return undefined;
		}

		// Parse ID and return
		return parseInt(id, 10);
	} catch (e) {
		// If any error occurs, return undefined
		return undefined;
	}
}

interface OEmbedResponse {
	version: string;
	type: string;
	html: string;
	width?: number | null;
	height?: number | null;
	title?: string;
	author_name?: string;
	author_url?: string;
	provider_name?: string;
	provider_url?: string;
	cache_age?: string;
	thumbnail_url?: string;
	thumbnail_width?: number;
	thumbnail_height?: number;
}

interface HackerNewsItem {
	by?: string;
	id?: number;
	kids?: number[];
	parent?: number;
	text?: string;
	time?: number;
	type?: string;
	title?: string; // For story items
	url?: string;
	[key: string]: any;
}

// Utility function to get relative time
function timeAgo(timestamp: number): string {
	const now = Date.now();
	const secondsPast = (now - timestamp * 1000) / 1000;

	if (secondsPast < 60) {
		return `${Math.floor(secondsPast)} seconds ago`;
	}
	if (secondsPast < 3600) {
		return `${Math.floor(secondsPast / 60)} minutes ago`;
	}
	if (secondsPast < 86400) {
		return `${Math.floor(secondsPast / 3600)} hours ago`;
	}
	if (secondsPast < 2592000) {
		return `${Math.floor(secondsPast / 86400)} days ago`;
	}
	if (secondsPast < 31104000) {
		return `${Math.floor(secondsPast / 2592000)} months ago`;
	}
	return `${Math.floor(secondsPast / 31104000)} years ago`;
}

async function getCommentThread(itemId: number): Promise<{ thread: HackerNewsItem[]; storyId: number; isStory: boolean }> {
	const thread: HackerNewsItem[] = [];
	let currentId = itemId;
	let storyId = 0;
	let isStory = false;

	while (true) {
		const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`);
		if (!response.ok) {
			throw new Error('Item not found');
		}
		const data = await response.json() as HackerNewsItem;

		thread.unshift(data); // Add to the beginning to build from root to leaf

		if (data.type === 'story') {
			storyId = data.id || 0;
			if (data.id === itemId) {
				isStory = true;
			}
			break;
		}

		if (!data.parent) {
			break;
		}

		currentId = data.parent;
	}

	if (storyId === 0 && thread.length > 0 && thread[0].parent) {
		// If storyId is not set, use the parent of the first item
		storyId = thread[0].parent!;
	}

	return { thread, storyId, isStory };
}

function generateStoryHTML(story: HackerNewsItem): string {
	const title = sanitizeHtml(story.title || '');
	const url = story.url || '';
	const author = story.by || '[deleted]';
	const time = story.time ? timeAgo(story.time) : '';
	const score = story.score || 0;
	const descendants = story.descendants || 0;
	const storyId = story.id || '';

	// Extract domain from URL
	let domain = '';
	if (url) {
		try {
			const parsedUrl = new URL(url);
			domain = parsedUrl.hostname.replace('www.', '');
		} catch (e) {
			// Ignore URL parsing errors
		}
	}

	const storyUrl = `https://news.ycombinator.com/item?id=${storyId}`;

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
	`;

	return html;
}


function generateThreadHTML(thread: HackerNewsItem[], requestedItemId: number): string {
	let html = '';

	thread.forEach((comment, index) => {
		// Handle the story differently
		if (index === 0 && comment.type === 'story') {
			html += generateStoryHTML(comment);
			return;
		}

		const sanitizedText = sanitizeHtml(comment.text || '', {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
			allowedAttributes: {
				a: ['href', 'name', 'target'],
				img: ['src'],
				'*': ['class'],
			},
		});

		const relativeTime = comment.time ? timeAgo(comment.time) : '';

		const indent = index * 20; // Adjust indentation per level

		const author = comment.by || '[deleted]';
		const commentId = comment.id || '';
		const commentUrl = `https://news.ycombinator.com/item?id=${commentId}`;

		const isRequestedComment = comment.id === requestedItemId;

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
		`;
	});

	return html;
}

const hackerNewsOembed = async (itemId: number) => {
	try {
		// Get the comment thread and story ID
		const { thread, storyId, isStory } = await getCommentThread(itemId);

		if (thread.length === 0) {
			return errorResponse(404, 'Item not found');
		}

		let htmlContent: string;

		if (isStory) {
			// Generate HTML for the story
			const story = thread[0];
			htmlContent = generateStoryHTML(story);
		} else {
			// Generate HTML for the thread
			htmlContent = generateThreadHTML(thread, itemId);
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
		`;

		// Build the oEmbed response
		const oEmbedResponse: OEmbedResponse = {
			version: '1.0',
			type: 'rich',
			html: html,
			width: 600,
			height: null,
			author_name: thread[thread.length - 1].by || '[deleted]',
			provider_name: 'Hacker News',
			provider_url: 'https://news.ycombinator.com',
			cache_age: '86400', // Cache for one day
		};

		return new Response(JSON.stringify(oEmbedResponse), {
			status: 200,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
			},
		});

	} catch (error) {
		console.error('Error fetching Hacker News item:', error);
		if (error.message === 'Item not found') {
			return errorResponse(404, 'Item not found');
		}
		return errorResponse(500, 'Internal Server Error');
	}
};

function errorResponse(httpStatusCode: number, message: string) {
  const errorResponse = {
    errors: [
      {
        message: message,
      },
    ],
  };

  return new Response(JSON.stringify(errorResponse), {
    status: httpStatusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, max-age=0",
    },
  });
}
