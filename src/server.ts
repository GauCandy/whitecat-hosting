import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app: Application = express();

// Configuration
const PORT: number = parseInt(process.env.PORT || '3000', 10);
const IPV6_ADDRESS: string = process.env.IPV6_ADDRESS || '::';

// Discord OAuth Configuration
const DISCORD_CLIENT_ID: string = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET: string = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI: string = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`;

// Simple in-memory session store (use Redis in production)
interface Session {
    id: string;
    userId?: string;
    username?: string;
    avatar?: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    createdAt: Date;
}

const sessions: Map<string, Session> = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple cookie parser
app.use((req: Request, res: Response, next: NextFunction) => {
    const cookies: { [key: string]: string } = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            cookies[name] = value;
        });
    }
    (req as any).cookies = cookies;
    next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'WhiteCat Hosting',
        timestamp: new Date().toISOString()
    });
});

// ========================================
// Discord OAuth Routes
// ========================================

// Initiate Discord OAuth
app.get('/auth/discord', (req: Request, res: Response) => {
    if (!DISCORD_CLIENT_ID) {
        return res.status(500).json({
            error: 'Discord OAuth not configured',
            message: 'Please set DISCORD_CLIENT_ID in environment variables'
        });
    }

    const state = crypto.randomBytes(16).toString('hex');

    // Store state in a temporary session
    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date()
    });

    // Set session cookie
    res.cookie('whitecat_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1 hour
    });

    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify email',
        state: state
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// Discord OAuth callback
app.get('/auth/discord/callback', async (req: Request, res: Response) => {
    const { code, error } = req.query;

    if (error) {
        return res.redirect('/?error=discord_auth_failed');
    }

    if (!code || typeof code !== 'string') {
        return res.redirect('/?error=no_code');
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_REDIRECT_URI
            })
        });

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', await tokenResponse.text());
            return res.redirect('/?error=token_exchange_failed');
        }

        const tokens = await tokenResponse.json() as {
            access_token: string;
            refresh_token: string;
            token_type: string;
            expires_in: number;
        };

        // Get user info from Discord
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`
            }
        });

        if (!userResponse.ok) {
            console.error('Failed to get user info:', await userResponse.text());
            return res.redirect('/?error=user_info_failed');
        }

        const user = await userResponse.json() as {
            id: string;
            username: string;
            discriminator: string;
            avatar: string | null;
            email: string;
        };

        // Create or update session
        const sessionId = crypto.randomBytes(32).toString('hex');
        const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;

        sessions.set(sessionId, {
            id: sessionId,
            userId: user.id,
            username: user.username,
            avatar: avatarUrl,
            email: user.email,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            createdAt: new Date()
        });

        // Set session cookie
        res.cookie('whitecat_session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 3600000 // 7 days
        });

        res.redirect('/?login=success');

    } catch (err) {
        console.error('Discord OAuth error:', err);
        res.redirect('/?error=oauth_error');
    }
});

// Get current user
app.get('/api/user', (req: Request, res: Response) => {
    const sessionId = (req as any).cookies?.whitecat_session;

    if (!sessionId) {
        return res.json({ authenticated: false });
    }

    const session = sessions.get(sessionId);

    if (!session || !session.userId) {
        return res.json({ authenticated: false });
    }

    res.json({
        authenticated: true,
        user: {
            id: session.userId,
            username: session.username,
            avatar: session.avatar,
            email: session.email
        }
    });
});

// Logout
app.post('/auth/logout', (req: Request, res: Response) => {
    const sessionId = (req as any).cookies?.whitecat_session;

    if (sessionId) {
        sessions.delete(sessionId);
    }

    res.clearCookie('whitecat_session');
    res.json({ success: true });
});

// ========================================
// API Endpoints
// ========================================

interface ContactFormData {
    name: string;
    email: string;
    phone?: string;
    message: string;
}

app.post('/api/contact', (req: Request, res: Response) => {
    const { name, email, phone, message }: ContactFormData = req.body;

    // Validate required fields
    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

    // Log contact submission (in production, send email or save to database)
    console.log('Contact form submission:', {
        name,
        email,
        phone,
        message,
        timestamp: new Date().toISOString()
    });

    res.json({
        success: true,
        message: 'Thank you for contacting WhiteCat Hosting!'
    });
});

// Catch-all route - serve index.html for SPA-like behavior
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server with IPv6 support
const server = app.listen(PORT, IPV6_ADDRESS, () => {
    console.log(`
    🐱 WhiteCat Hosting Server
    ==========================
    Server running at:
    - IPv6: http://[${IPV6_ADDRESS}]:${PORT}
    - Local: http://localhost:${PORT}

    Environment: ${process.env.NODE_ENV || 'development'}
    Discord OAuth: ${DISCORD_CLIENT_ID ? 'Configured' : 'Not configured'}
    `);
});

// Clean up old sessions periodically
setInterval(() => {
    const now = new Date();
    sessions.forEach((session, id) => {
        const age = now.getTime() - session.createdAt.getTime();
        if (age > 7 * 24 * 3600000) { // 7 days
            sessions.delete(id);
        }
    });
}, 3600000); // Run every hour

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Handle errors
server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else if (error.code === 'EACCES') {
        console.error(`Port ${PORT} requires elevated privileges`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

export default app;
