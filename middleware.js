import { jwtVerify, createRemoteJWKSet } from 'jose';

// Configuration
let JWKS = null;

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
    ],
};

export default async function middleware(request) {
    try {
        // 1. Safe Env Access & Sanitization
        const teamDomainEnv = process.env.CF_TEAM_DOMAIN || "";
        const audienceEnv = process.env.CF_ACCESS_AUD || "";
        const skipAuthEnv = process.env.SKIP_AUTH_CHECK || "";

        const TEAM_DOMAIN = teamDomainEnv.trim();
        const AUDIENCE_TAG = audienceEnv.trim();
        const SKIP_AUTH = skipAuthEnv.trim() === 'true';

        // 2. Skip Logic
        if (SKIP_AUTH) {
            return;
        }

        // 3. Validation
        if (!TEAM_DOMAIN || !AUDIENCE_TAG) {
            console.error("Middleware: Missing Env Vars");
            return new Response(
                `Configuration Error: Missing CF_TEAM_DOMAIN or CF_ACCESS_AUD.
         Got Domain length: ${TEAM_DOMAIN.length}
         Got Aud length: ${AUDIENCE_TAG.length}`,
                { status: 500 }
            );
        }

        // 4. Lazy JWKS Init
        if (!JWKS) {
            try {
                let domainUrl = TEAM_DOMAIN;
                // Strip protocols and trails to normalize
                domainUrl = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

                const fullUrlStr = `https://${domainUrl}/cdn-cgi/access/certs`;
                // Validate URL construction
                const jwksUrl = new URL(fullUrlStr);

                JWKS = createRemoteJWKSet(jwksUrl);
            } catch (err) {
                console.error("JWKS Init Error:", err);
                return new Response(`Middleware Config Error: Invalid Domain URL. ${err.message}`, { status: 500 });
            }
        }

        // 5. Token Extraction
        const token = request.cookies.get('CF_Authorization')?.value;
        if (!token) {
            // Return 403 to indicate unauthorized
            return new Response("Unauthorized: Missing CF_Authorization token.", { status: 403 });
        }

        // 6. JWT Verification
        // Normalize issuer
        let issuerDomain = TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const expectedIssuer = `https://${issuerDomain}`;

        await jwtVerify(token, JWKS, {
            audience: AUDIENCE_TAG,
            issuer: expectedIssuer,
        });

        // Success - allow request to continue
        return;

    } catch (globalErr) {
        // Catch-all for runtime crashes (e.g. library issues, crypto missing)
        console.error("Middleware Global Crash:", globalErr);
        return new Response(
            `Internal Middleware Error: ${globalErr.message}. 
       Stack: ${globalErr.stack ? 'Logged' : 'No Stack'}`,
            { status: 500 }
        );
    }
}
