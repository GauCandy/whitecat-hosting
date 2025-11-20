import { Request, Response } from 'express';
import { AuthRequest, HttpError } from '../types';
import { authService } from '../services/auth.service';
import { userRepository } from '../database/repository';
import { sessionService } from '../services/session.service';
import { asyncHandler } from '../middleware/errorHandler';
import { config, isProduction } from '../config';

export const authController = {
    // Initiate Discord OAuth
    login: asyncHandler(async (req: Request, res: Response) => {
        const authUrl = authService.getAuthorizationUrl();

        // Create temporary session
        const sessionId = sessionService.createSession();
        res.cookie('whitecat_session', sessionId, {
            httpOnly: true,
            secure: isProduction,
            maxAge: 3600000 // 1 hour
        });

        res.redirect(authUrl);
    }),

    // Discord OAuth callback
    callback: asyncHandler(async (req: Request, res: Response) => {
        const { code, error } = req.query;

        if (error) {
            return res.redirect('/?error=discord_auth_failed');
        }

        if (!code || typeof code !== 'string') {
            return res.redirect('/?error=no_code');
        }

        const sessionId = await authService.handleCallback(code);

        res.cookie('whitecat_session', sessionId, {
            httpOnly: true,
            secure: isProduction,
            maxAge: config.session.maxAge
        });

        res.redirect('/?login=success');
    }),

    // Get current user
    getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
        const cookies: { [key: string]: string } = {};
        const cookieHeader = req.headers.cookie;

        if (cookieHeader) {
            cookieHeader.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                cookies[name] = value;
            });
        }

        const sessionId = cookies['whitecat_session'];
        if (!sessionId) {
            return res.json({ authenticated: false });
        }

        const session = sessionService.getSession(sessionId);
        if (!session || !session.userId) {
            return res.json({ authenticated: false });
        }

        // Get user from database
        const user = userRepository.findById(session.userId);
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
    }),

    // Logout
    logout: asyncHandler(async (req: Request, res: Response) => {
        const cookies: { [key: string]: string } = {};
        const cookieHeader = req.headers.cookie;

        if (cookieHeader) {
            cookieHeader.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                cookies[name] = value;
            });
        }

        const sessionId = cookies['whitecat_session'];
        if (sessionId) {
            authService.logout(sessionId);
        }

        res.clearCookie('whitecat_session');
        res.json({ success: true });
    })
};
