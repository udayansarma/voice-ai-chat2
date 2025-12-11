export interface AuthUser {
  username: string;
  password: string;
  apiKey?: string;
  rateLimitOverride?: number;
}

export interface AuthConfig {
  sessionSecret: string;
  sessionDurationHours: number;
  rateLimitPerMinute: number;
  users: AuthUser[];
  enabled: boolean;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  username: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  requestCount: number;
  lastRequestTime: Date;
}

export interface SessionStore {
  get(sessionId: string): Promise<UserSession | null>;
  set(sessionId: string, session: UserSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface LoginRequest {
  username: string;
  password: string;
}
