import { Response, NextFunction } from 'express';
import { AuthRequest, HttpError } from '../types';
import { sessionService } from '../services/session.service';
import { userRepository } from '../database/repository';

export const requireAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
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
            throw new HttpError(401, 'Unauthorized - No session');
        }

        const session = sessionService.getSession(sessionId);
        if (!session || !session.userId) {
            throw new HttpError(401, 'Unauthorized - Invalid session');
        }

        // Get user from database
        const user = userRepository.findById(session.userId);
        if (!user) {
            throw new HttpError(401, 'Unauthorized - User not found');
        }

        // Attach user info to request
        req.userId = user.id;
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email || undefined,
            avatar: user.avatar || undefined
        };

        next();
    } catch (error) {
        next(error);
    }
};

export const optionalAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
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
            const session = sessionService.getSession(sessionId);
            if (session?.userId) {
                const user = userRepository.findById(session.userId);
                if (user) {
                    req.userId = user.id;
                    req.user = {
                        id: user.id,
                        username: user.username,
                        email: user.email || undefined,
                        avatar: user.avatar || undefined
                    };
                }
            }
        }
        next();
    } catch (error) {
        next(error);
    }
};
