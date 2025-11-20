import { Request } from 'express';

// Extend Express Request type
export interface AuthRequest extends Request {
    userId?: string;
    user?: {
        id: string;
        username: string;
        email?: string;
        avatar?: string;
    };
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Session type
export interface Session {
    id: string;
    userId?: string;
    username?: string;
    avatar?: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    createdAt: Date;
}

// Discord OAuth types
export interface DiscordTokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email: string;
}

// HTTP Error
export class HttpError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'HttpError';
        Error.captureStackTrace(this, this.constructor);
    }
}
