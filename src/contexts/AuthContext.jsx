import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a zero-trust environment with HttpOnly cookies, client-side JS cannot read the token.
        // We rely on the Edge Middleware to enforce security.
        // If the app loads, we are authenticated.

        // We can try to fetch user info from an endpoint if we built one, 
        // or decode strict cookies if they weren't HttpOnly (Cloudflare defaults to HttpOnly).

        // For this implementation, we assume if the app is mounting, the user is valid.
        // We'll placeholder the user data.

        /* 
           NOTE: To get real user data, we need a backend endpoint that reads the 
           'cf-access-authenticated-user-email' header injected by Cloudflare 
           and returns it to the frontend.
        */

        setUser({
            isAuthenticated: true,
            name: "Verified User",
            email: "hidden@cloudflare.com" // Cannot read without BE endpoint
        });
        setLoading(false);

    }, []);

    const logout = () => {
        // Cloudflare Access logout URL
        // https://<your-team-domain>/cdn-cgi/access/logout
        // We need the domain from env, but envs are build-time in Vite unless VITE_ prefixed.
        // We can just query the current origin or hardcode if provided.
        const teamDomain = import.meta.env.VITE_CF_TEAM_DOMAIN;
        if (teamDomain) {
            window.location.href = `${teamDomain}/cdn-cgi/access/logout`;
        } else {
            console.warn("Logout: VITE_CF_TEAM_DOMAIN not set");
            window.location.reload(); // Fallback
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
