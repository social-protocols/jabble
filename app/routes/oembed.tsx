import { type LoaderFunctionArgs, type LoaderFunction } from "@remix-run/node";

import fetch from 'node-fetch';
import sanitizeHtml from 'sanitize-html';


export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {

	const request = args.request

	const url = new URL(request.url).searchParams.get('url');

	if (!url) {
		return errorResponse(400, "url: queryParam is required")
	}

	if (isTweetUrl(url)) {
		return await proxyTwitterOembed(args);
	}


}


const proxyTwitterOembed: LoaderFunction = async ({ request }) => {

	const apiUrl = `https://publish.twitter.com/oembed${new URL(request.url).search}`;

	try {
		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'User-Agent': request.headers.get('User-Agent') || 'Jabble/1.0',
			},
		});

		// Return Twitter's response directly
		return new Response(response.body, {
			status: response.status,
			headers: response.headers,
		});
	} catch (error: any) {
		console.error('Error fetching from Twitter API:', error);

		return errorResponse(502, "The proxy server received an invalid response from the upstream server.")
	}
};


function isTweetUrl(url: string): boolean {
	const regex =
		/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/
	return regex.test(url)
}

function isHackerNewsItemUrl(url: string): boolean {
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

async function getHackerNewsCommentOEmbed(commentId: number): Promise<OEmbedResponse> {
  try {
    // Fetch the comment data from the Hacker News API
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch comment with id ${commentId}`);
    }

    const data = await response.json();

    // Check if the item is a comment
    if (data.type !== 'comment') {
      throw new Error('Item is not a comment');
    }

    // Check if the comment text exists
    if (!data.text) {
      throw new Error('Comment text is missing');
    }

    // Sanitize the comment text to prevent XSS attacks
    const sanitizedText = sanitizeHtml(data.text, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      allowedAttributes: {
        a: ['href', 'name', 'target'],
        img: ['src'],
        '*': ['class'],
      },
    });

    // Format the timestamp to a readable date and time
    const date = new Date(data.time * 1000);
    const formattedTime = date.toLocaleString('en-US', { timeZone: 'UTC' });

    // Generate the HTML for the comment
    const html = `
<style>
.hn-comment {
  font-family: Verdana, Geneva, sans-serif;
  font-size: 10pt;
  line-height: 1.4em;
}

.hn-comment-header {
  margin-bottom: 5px;
}

.hn-comment-author {
  font-weight: bold;
}

.hn-comment-time {
  color: #828282;
  margin-left: 5px;
  font-size: 8pt;
}

.hn-comment-link {
  margin-left: 5px;
}

.hn-comment-text {
  margin-top: 10px;
}
</style>
<div class="hn-comment">
  <div class="hn-comment-header">
    <span class="hn-comment-author">
      <a href="https://news.ycombinator.com/user?id=${encodeURIComponent(data.by)}">${data.by}</a>
    </span>
    <span class="hn-comment-time">${formattedTime}</span>
    <span class="hn-comment-link">
      <a href="https://news.ycombinator.com/item?id=${data.id}">link</a>
    </span>
  </div>
  <div class="hn-comment-text">${sanitizedText}</div>
</div>
`;

    // Build the oEmbed response
    const oEmbedResponse: OEmbedResponse = {
      version: '1.0',
      type: 'rich',
      html: html,
      width: 600,
      height: null,
      author_name: data.by,
      author_url: `https://news.ycombinator.com/user?id=${encodeURIComponent(data.by)}`,
      provider_name: 'Hacker News',
      provider_url: 'https://news.ycombinator.com',
      cache_age: '86400', // Cache for one day
    };

    return oEmbedResponse;
  } catch (error) {
    throw error;
  }
}




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