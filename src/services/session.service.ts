import crypto from 'crypto';
import { Session } from '../types';
import { config } from '../config';

class SessionService {
    private sessions: Map<string, Session> = new Map();

    constructor() {
        // Start cleanup interval
        this.startCleanup();
    }

    createSession(data: Partial<Session> = {}): string {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const session: Session = {
            id: sessionId,
            ...data,
            createdAt: new Date()
        };

        this.sessions.set(sessionId, session);
        return sessionId;
    }

    getSession(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    updateSession(sessionId: string, data: Partial<Session>): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        this.sessions.set(sessionId, { ...session, ...data });
        return true;
    }

    deleteSession(sessionId: string): boolean {
        return this.sessions.delete(sessionId);
    }

    private startCleanup(): void {
        setInterval(() => {
            const now = new Date();
            this.sessions.forEach((session, id) => {
                const age = now.getTime() - session.createdAt.getTime();
                if (age > config.session.maxAge) {
                    this.sessions.delete(id);
                }
            });
        }, config.session.cleanupInterval);
    }
}

export const sessionService = new SessionService();
