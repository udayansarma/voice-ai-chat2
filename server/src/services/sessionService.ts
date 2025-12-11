import { v4 as uuidv4 } from 'uuid';
import { authConfig } from '../config/env';
import { UserSession, AuthUser } from '../types/auth';
import { sessionStore } from '../storage/sessionStore';

class SessionService {
  async createSession(user: AuthUser): Promise<UserSession> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + authConfig.sessionDurationHours);

    const session: UserSession = {
      sessionId,
      userId: user.username,
      username: user.username,
      createdAt: now,
      expiresAt,
      lastActivity: now,
      requestCount: 0,
      lastRequestTime: now,
    };

    await sessionStore.set(sessionId, session);
    return session;
  }

  async validateSession(sessionId: string): Promise<UserSession | null> {
    const session = await sessionStore.get(sessionId);
    if (!session) return null;

    // Check expiration
    const now = new Date();
    if (now > session.expiresAt) {
      await this.deleteSession(sessionId);
      return null;
    }
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await sessionStore.delete(sessionId);
  }
}

export const sessionService = new SessionService();
