import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Import database
import { initializeDatabase } from './database/schema';
import {
    userRepository,
    serverConfigRepository,
    userServerRepository,
    transactionRepository
} from './database/repository';

// Initialize database
initializeDatabase();

const app: Application = express();

// Configuration
const PORT: number = parseInt(process.env.PORT || '3000', 10);
const HOST: string = process.env.HOST || '0.0.0.0'; // Listen on all interfaces (IPv4)

// Discord OAuth Configuration
const DISCORD_CLIENT_ID: string = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET: string = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI: string = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`;

// Simple in-memory session store (use Redis in production)
interface Session {
    id: string;
    odUserId?: string;
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

// Auth middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const sessionId = (req as any).cookies?.whitecat_session;
    if (!sessionId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = sessions.get(sessionId);
    if (!session || !session.odUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    (req as any).userId = session.odUserId;
    next();
};

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

    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date()
    });

    res.cookie('whitecat_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000
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

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`
            }
        });

        if (!userResponse.ok) {
            console.error('Failed to get user info:', await userResponse.text());
            return res.redirect('/?error=user_info_failed');
        }

        const discordUser = await userResponse.json() as {
            id: string;
            username: string;
            discriminator: string;
            avatar: string | null;
            email: string;
        };

        // Create or update user in database
        const avatarUrl = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator) % 5}.png`;

        const user = userRepository.upsert({
            id: discordUser.id,
            username: discordUser.username,
            email: discordUser.email,
            avatar: avatarUrl
        });

        // Create session
        const sessionId = crypto.randomBytes(32).toString('hex');
        sessions.set(sessionId, {
            id: sessionId,
            odUserId: user.id,
            username: user.username,
            avatar: avatarUrl,
            email: user.email || undefined,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            createdAt: new Date()
        });

        res.cookie('whitecat_session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 3600000
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

    if (!session || !session.odUserId) {
        return res.json({ authenticated: false });
    }

    // Get user from database
    const user = userRepository.findById(session.odUserId);

    if (!user) {
        return res.json({ authenticated: false });
    }

    res.json({
        authenticated: true,
        user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            email: user.email,
            balance: user.balance
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
// Server Config API
// ========================================

// Get all active server configs
app.get('/api/configs', (req: Request, res: Response) => {
    const configs = serverConfigRepository.findAllActive();
    res.json(configs.map(config => ({
        ...config,
        features: JSON.parse(config.features)
    })));
});

// Get single config
app.get('/api/configs/:id', (req: Request, res: Response) => {
    const config = serverConfigRepository.findById(parseInt(req.params.id));
    if (!config) {
        return res.status(404).json({ error: 'Config not found' });
    }
    res.json({
        ...config,
        features: JSON.parse(config.features)
    });
});

// ========================================
// User Balance API
// ========================================

// Get user balance
app.get('/api/user/balance', requireAuth, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const balance = userRepository.getBalance(userId);
    res.json({ balance });
});

// Add balance (deposit) - In production, integrate with payment gateway
app.post('/api/user/deposit', requireAuth, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    // Update balance
    userRepository.updateBalance(userId, amount);

    // Create transaction record
    transactionRepository.create({
        user_id: userId,
        type: 'deposit',
        amount: amount,
        description: 'Nạp tiền vào tài khoản'
    });

    const newBalance = userRepository.getBalance(userId);
    res.json({ success: true, balance: newBalance });
});

// Get transaction history
app.get('/api/user/transactions', requireAuth, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = transactionRepository.findByUserId(userId, limit);
    res.json(transactions);
});

// ========================================
// User Server API
// ========================================

// Get user's servers
app.get('/api/user/servers', requireAuth, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const servers = userServerRepository.findByUserId(userId);
    res.json(servers);
});

// Purchase a server
app.post('/api/user/servers', requireAuth, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { config_id, server_name, months = 1 } = req.body;

    if (!config_id || !server_name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get config and check price
    const config = serverConfigRepository.findById(config_id);
    if (!config) {
        return res.status(404).json({ error: 'Config not found' });
    }

    const totalPrice = config.price_monthly * months;
    const balance = userRepository.getBalance(userId);

    if (balance < totalPrice) {
        return res.status(400).json({
            error: 'Insufficient balance',
            required: totalPrice,
            current: balance
        });
    }

    // Deduct balance
    userRepository.updateBalance(userId, -totalPrice);

    // Create server
    const server = userServerRepository.create({
        user_id: userId,
        config_id: config_id,
        server_name: server_name,
        months: months
    });

    if (!server) {
        // Refund if server creation failed
        userRepository.updateBalance(userId, totalPrice);
        return res.status(500).json({ error: 'Failed to create server' });
    }

    // Create transaction record
    transactionRepository.create({
        user_id: userId,
        type: 'purchase',
        amount: -totalPrice,
        description: `Mua server ${config.name} - ${server_name} (${months} tháng)`,
        reference_id: server.id.toString()
    });

    res.json({
        success: true,
        server: server,
        new_balance: userRepository.getBalance(userId)
    });
});

// Extend server
app.post('/api/user/servers/:id/extend', requireAuth, (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const serverId = parseInt(req.params.id);
    const { months = 1 } = req.body;

    // Get server
    const server = userServerRepository.findById(serverId);
    if (!server || server.user_id !== userId) {
        return res.status(404).json({ error: 'Server not found' });
    }

    // Get config for price
    const config = serverConfigRepository.findById(server.config_id);
    if (!config) {
        return res.status(404).json({ error: 'Config not found' });
    }

    const totalPrice = config.price_monthly * months;
    const balance = userRepository.getBalance(userId);

    if (balance < totalPrice) {
        return res.status(400).json({
            error: 'Insufficient balance',
            required: totalPrice,
            current: balance
        });
    }

    // Deduct balance and extend
    userRepository.updateBalance(userId, -totalPrice);
    userServerRepository.extend(serverId, months);

    // Create transaction
    transactionRepository.create({
        user_id: userId,
        type: 'purchase',
        amount: -totalPrice,
        description: `Gia hạn server ${server.server_name} (${months} tháng)`,
        reference_id: serverId.toString()
    });

    res.json({
        success: true,
        new_balance: userRepository.getBalance(userId)
    });
});

// ========================================
// Contact Form
// ========================================

interface ContactFormData {
    name: string;
    email: string;
    phone?: string;
    message: string;
}

app.post('/api/contact', (req: Request, res: Response) => {
    const { name, email, phone, message }: ContactFormData = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

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

// Catch-all route
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, HOST, () => {
    console.log(`
    🐱 WhiteCat Hosting Server
    ==========================
    Server running at:
    - http://${HOST}:${PORT}
    - http://localhost:${PORT}

    Environment: ${process.env.NODE_ENV || 'development'}
    Discord OAuth: ${DISCORD_CLIENT_ID ? 'Configured' : 'Not configured'}
    Database: SQLite (data/whitecat.db)
    `);
});

// Clean up old sessions periodically
setInterval(() => {
    const now = new Date();
    sessions.forEach((session, id) => {
        const age = now.getTime() - session.createdAt.getTime();
        if (age > 7 * 24 * 3600000) {
            sessions.delete(id);
        }
    });
}, 3600000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

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
