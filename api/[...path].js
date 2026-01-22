export const config = {
    runtime: 'edge', // Using Edge Runtime for better streaming support
};

export default async function handler(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, ''); // Strip /api prefix
    const search = url.search; // Keep query params

    // 1. Get Backend URL
    // Default to localhost if not set (dev mode fallback, though tunnel is preferred)
    const backendBase = process.env.MCP_API_URL;

    if (!backendBase) {
        return new Response(JSON.stringify({ error: "MCP_API_URL not configured" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const targetUrl = `${backendBase}${path}${search}`;

    // 2. Prepare Headers
    const headers = new Headers(req.headers);

    // Service Tokens injection removed per user request


    // Clean up headers
    headers.delete('host'); // Let fetch set the host
    headers.delete('connection');
    // Optional: Pass original IP? CF Tunnel handles this usually.

    try {
        // 3. Forward Request
        const backendResponse = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: req.body, // Pass body stream directly
            redirect: 'manual'
        });

        // 4. Return Response (Stream)
        return new Response(backendResponse.body, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: backendResponse.headers
        });
    } catch (error) {
        console.error("Proxy Error:", error);
        return new Response(JSON.stringify({ error: "Proxy Failed", details: String(error) }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
