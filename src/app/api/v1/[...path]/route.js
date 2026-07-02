import { NextResponse } from 'next/server';

// Proxy all requests to the remote Render backend or local Docker backend
// This custom proxy Route Handler replaces the next.config.mjs rewrites
// to prevent Turbopack panics when the proxy encounters a timeout.

const TARGET_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') + '/api/v1';

async function proxyRequest(request, { params }) {
  // Await params to avoid Next.js 15+ warnings about synchronous access
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  
  // Construct target URL keeping the search query string
  const targetUrl = `${TARGET_BASE_URL}/${path}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  // Remove host header so fetch uses the target URL's host
  headers.delete('host');

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : null,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    // IMPORTANT: Node's fetch automatically decompresses gzip/br bodies.
    // If we pass the original 'content-encoding' header to the browser, 
    // the browser will fail to decode the uncompressed body and throw "Failed to fetch".
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Custom Proxy Error:', error);
    // If Render takes too long to wake up, fetch throws an error.
    // Return 504 Gateway Timeout cleanly without crashing Next.js.
    return NextResponse.json(
      { detail: 'Backend server is sleeping or unresponsive. Please try again in a few seconds.' },
      { status: 504 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
