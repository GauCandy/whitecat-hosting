import crypto from 'crypto';
import { config } from '../config';
import { HttpError, DiscordTokenResponse, DiscordUser } from '../types';
import { userRepository } from '../database/repository';
import { sessionService } from './session.service';

class AuthService {
    getAuthorizationUrl(): string {
        if (!config.discord.clientId) {
            throw new HttpError(500, 'Discord OAuth not configured');
        }

        const params = new URLSearchParams({
            client_id: config.discord.clientId,
            redirect_uri: config.discord.redirectUri,
            response_type: 'code',
            scope: 'identify email',
            state: crypto.randomBytes(16).toString('hex')
        });

        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    }

    async exchangeCode(code: string): Promise<DiscordTokenResponse> {
        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: config.discord.clientId,
                client_secret: config.discord.clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: config.discord.redirectUri
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Token exchange failed:', error);
            throw new HttpError(400, 'Failed to exchange authorization code');
        }

        return await response.json();
    }

    async getDiscordUser(accessToken: string): Promise<DiscordUser> {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Failed to get user info:', error);
            throw new HttpError(400, 'Failed to get user information');
        }

        return await response.json();
    }

    createSession(userId: string, username: string, email?: string, avatar?: string, tokens?: DiscordTokenResponse): string {
        return sessionService.createSession({
            userId,
            username,
            email,
            avatar,
            accessToken: tokens?.access_token,
            refreshToken: tokens?.refresh_token
        });
    }

    async handleCallback(code: string): Promise<string> {
        // Exchange code for tokens
        const tokens = await this.exchangeCode(code);

        // Get user info
        const discordUser = await this.getDiscordUser(tokens.access_token);

        // Generate avatar URL
        const avatarUrl = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator) % 5}.png`;

        // Upsert user in database
        const user = await userRepository.upsert({
            id: discordUser.id,
            username: discordUser.username,
            email: discordUser.email,
            avatar: avatarUrl
        });

        // Create session
        const sessionId = this.createSession(
            user.id,
            user.username,
            user.email || undefined,
            avatarUrl,
            tokens
        );

        return sessionId;
    }

    logout(sessionId: string): boolean {
        return sessionService.deleteSession(sessionId);
    }
}

export const authService = new AuthService();
