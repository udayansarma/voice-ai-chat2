import { SessionStore, UserSession } from '../types/auth';

class InMemorySessionStore implements SessionStore {
  private sessions: Map<string, UserSession> = new Map();

  async get(sessionId: string): Promise<UserSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return session;
  }

  async set(sessionId: string, session: UserSession): Promise<void> {
    this.sessions.set(sessionId, session);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }
}

export const sessionStore = new InMemorySessionStore();
// Periodically clean up expired sessions
setInterval(() => sessionStore.cleanup(), 60 * 60 * 1000);
