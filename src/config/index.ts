import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database
    database: {
        path: process.env.DATABASE_PATH || './data/whitecat.db'
    },

    // Discord OAuth
    discord: {
        clientId: process.env.DISCORD_CLIENT_ID || '',
        clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
        redirectUri: process.env.DISCORD_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/auth/discord/callback`
    },

    // Session
    session: {
        secret: process.env.SESSION_SECRET || 'whitecat-session-secret-change-in-production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        cleanupInterval: 60 * 60 * 1000 // 1 hour
    },

    // Security
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    }
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
