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
  by: string;
  id: number;
  kids?: number[];
  parent?: number;
  text?: string;
  time: number;
  type: string;
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

// Function to fetch the comment thread
async function getCommentThread(itemId: number): Promise<HackerNewsItem[]> {
  const thread: HackerNewsItem[] = [];

  let currentId = itemId;

  while (true) {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`);
    if (!response.ok) {
      break; // or throw an error
    }
    const data = await response.json() as HackerNewsItem;

    thread.unshift(data); // Add to the beginning to build from root to leaf

    if (!data.parent || data.type === 'story') {
      break;
    }

    currentId = data.parent;
  }

  return thread;
}

// Function to generate HTML for the comment thread
function generateThreadHTML(thread: HackerNewsItem[]): string {
  let html = '';
  const totalLevels = thread.length;

  thread.forEach((comment, index) => {
    // Skip the story item if it's at the beginning
    if (index === 0 && comment.type === 'story') {
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

    const relativeTime = timeAgo(comment.time);

    const isLast = index === totalLevels - 1;

    const indent = index * 20; // Adjust indentation per level

    html += `
      <div class="hn-comment-level" style="margin-left: ${indent}px;">
        ${!isLast ? `<div class="hn-vertical-line" style="left: ${-10 + indent}px;"></div>` : ''}
        <div class="hn-comment" style="font-size: ${isLast ? '10pt' : '9pt'};">
          <div class="hn-comment-header">
            <span class="hn-comment-author">${comment.by}</span>
            <span class="hn-comment-time">${relativeTime}</span>
          </div>
          <div class="hn-comment-text">${sanitizedText}</div>
        </div>
      </div>
    `;
  });

  return html;
}

const hackerNewsOembed = async (itemId: number) => {
  try {
    // Get the comment thread
    const thread = await getCommentThread(itemId);

    if (thread.length === 0) {
      throw new Error('Comment not found');
    }

    // Generate HTML for the thread
    const htmlContent = generateThreadHTML(thread);

    // Wrap the entire content in the main container
    const html = `
    <style>
    .hn-comment-thread {
      position: relative;
      font-family: Verdana, Geneva, sans-serif;
      font-size: 10pt;
      line-height: 1.4em;
      border: 1px solid #e6e6e6;
      border-radius: 8px;
      padding: 10px;
      background-color: #f6f6ef;
    }

    .hn-comment-level {
      position: relative;
      margin-bottom: 10px;
    }

    .hn-comment {
      position: relative;
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

    .hn-comment-text {
      margin-top: 10px;
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

    .hn-vertical-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: #e6e6e6;
    }

    .hn-comment-level:last-child .hn-vertical-line {
      bottom: calc(100% - 20px); /* Adjust to end above the username */
    }

    </style>
    <a href="https://news.ycombinator.com/item?id=${thread[thread.length - 1].id}" target="_blank" rel="noopener noreferrer" class="hn-comment-link">
      <div class="hn-comment-thread">
        <div class="hn-logo">
          <img src="https://news.ycombinator.com/favicon.ico" alt="Hacker News">
        </div>
        ${htmlContent}
      </div>
    </a>
    `;

    // Build the oEmbed response
    const oEmbedResponse: OEmbedResponse = {
      version: '1.0',
      type: 'rich',
      html: html,
      width: 600,
      height: null,
      author_name: thread[thread.length - 1].by,
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
