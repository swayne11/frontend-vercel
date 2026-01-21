import { jwtVerify, createRemoteJWKSet } from 'jose';

// Configuration
// We access envs inside the function to ensure they are available in all runtime contexts
// preventing potential top-level access issues.

let JWKS = null;

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
    ],
};

export default async function middleware(request) {
    const TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN;
    const AUDIENCE_TAG = process.env.CF_ACCESS_AUD;
    const SKIP_AUTH = process.env.SKIP_AUTH_CHECK === 'true';

    if (SKIP_AUTH) {
        return;
    }

    if (!TEAM_DOMAIN || !AUDIENCE_TAG) {
        console.error("Middleware: Missing CF_TEAM_DOMAIN or CF_ACCESS_AUD env vars");
        return new Response(
            `Configuration Error: Missing Cloudflare Access settings in Vercel.
       ensure CF_TEAM_DOMAIN and CF_ACCESS_AUD are strictly set.
       Current Domain: ${TEAM_DOMAIN ? 'Set' : 'Missing'}
       Current Aud: ${AUDIENCE_TAG ? 'Set' : 'Missing'}`,
            { status: 500 }
        );
    }

    // Lazy Initialization of JWKS to prevent top-level crashes
    if (!JWKS) {
        try {
            let domainUrl = TEAM_DOMAIN;
            if (!domainUrl.startsWith('https://')) {
                domainUrl = `https://${domainUrl}`;
            }
            // Remove trailing slash if present
            if (domainUrl.endsWith('/')) {
                domainUrl = domainUrl.slice(0, -1);
            }

            const jwksUrl = new URL(`${domainUrl}/cdn-cgi/access/certs`);
            JWKS = createRemoteJWKSet(jwksUrl);
        } catch (err) {
            console.error("Middleware Config Error:", err);
            return new Response(`Configuration Error: Invalid CF_TEAM_DOMAIN. ${err.message}`, { status: 500 });
        }
    }

    const token = request.cookies.get('CF_Authorization')?.value;

    if (!token) {
        return new Response("Unauthorized: Missing CF_Authorization token.", { status: 403 });
    }

    try {
        // Ensure domain is clean for issuer check
        let issuer = TEAM_DOMAIN;
        if (!issuer.startsWith('https://')) issuer = `https://${issuer}`;
        if (issuer.endsWith('/')) issuer = issuer.slice(0, -1);

        await jwtVerify(token, JWKS, {
            audience: AUDIENCE_TAG,
            issuer: issuer,
        });

        // Valid
        return;

    } catch (error) {
        console.error("JWT Verification Failed:", error.message);
        return new Response(`Forbidden: Invalid Token. ${error.message}`, { status: 403 });
    }
}
