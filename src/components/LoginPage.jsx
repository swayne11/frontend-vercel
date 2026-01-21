import React, { useState } from 'react';

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = () => {
        setIsLoading(true);
        // Redirect to Cloudflare Access
        // We assume the user is visiting the custom domain
        // The path usually is /cdn-cgi/access/login or simply reloading triggers the intercept

        const teamDomain = import.meta.env.VITE_CF_TEAM_DOMAIN;
        if (teamDomain) {
            window.location.href = `${teamDomain}/cdn-cgi/access/login`;
        } else {
            // Local dev simulation
            console.log("Simulating Login...");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#000',
            color: '#fff',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                padding: '2rem',
                borderRadius: '16px',
                background: 'rgba(20, 20, 20, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%'
            }}>
                <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>Debate Access</h1>
                <p style={{ marginBottom: '2rem', color: '#888' }}>
                    Restricted System. Please authenticate to view the live feed.
                </p>

                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    style={{
                        background: '#fff',
                        color: '#000',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: isLoading ? 'wait' : 'pointer',
                        opacity: isLoading ? 0.7 : 1,
                        width: '100%'
                    }}
                >
                    {isLoading ? 'Redirecting...' : 'Login with Access'}
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
