import { jwtVerify, createRemoteJWKSet } from 'jose';

// Configuration
const TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN;
const AUDIENCE_TAG = process.env.CF_ACCESS_AUD;
const SKIP_AUTH = process.env.SKIP_AUTH_CHECK === 'true';

// Cache the JWKS (Public Keys)
let JWKS;

if (TEAM_DOMAIN) {
    JWKS = createRemoteJWKSet(new URL(`${TEAM_DOMAIN}/cdn-cgi/access/certs`));
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes if unrelated)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - assets (vite assets)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
    ],
};

export default async function middleware(request) {
    if (SKIP_AUTH) {
        console.log("Middleware: Skipping Auth Check (SKIP_AUTH_CHECK=true)");
        return;
    }

    if (!TEAM_DOMAIN || !AUDIENCE_TAG) {
        console.error("Middleware: Missing CF_TEAM_DOMAIN or CF_ACCESS_AUD env vars");
        // Fail closed if config is missing in production, but open in dev if intended?
        // Let's return a 500 equivalent text for clarity
        return new Response("Configuration Error: Missing Cloudflare Access settings.", { status: 500 });
    }

    const token = request.cookies.get('CF_Authorization')?.value;

    if (!token) {
        // If no token, user is strictly unauthorized.
        // In a real Access setup, Cloudflare intercepts before Vercel.
        // If request reaches here without token, it means direct access attempt or misconfig.
        return new Response("Unauthorized: Missing CF_Authorization token.", { status: 403 });
    }

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            audience: AUDIENCE_TAG,
            issuer: `${TEAM_DOMAIN}`, // Issuer is the team domain
        });

        // Verification successful
        // You can also forward user info via headers if needed
        // const response = NextResponse.next();
        // response.headers.set('x-user-email', payload.email);
        // return response;

        // For raw Edge Middleware, simply returning allows the request to proceed (NextResponse is for Next.js)
        // In strict Vercel Edge Middleware, we just don't return a Response object to continue? 
        // Wait, 'middleware' expects specific return types in Next.js.
        // BUT this is a Vite app on Vercel. Vercel supports 'Edge Middleware' via `middleware.js` in root.
        // It uses `NextResponse` from `next/server` usually, but we don't have next installed.
        // Standard Vercel Edge Middleware signature: (request: Request) -> Response | void

        // If we return nothing (undefined), Vercel proceeds to the static asset/function.
        return;

    } catch (error) {
        console.error("JWT Verification Failed:", error.message);
        return new Response("Forbidden: Invalid Token signature.", { status: 403 });
    }
}
