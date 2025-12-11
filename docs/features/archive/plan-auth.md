# Feature Design Document: Simple Session-Based Authentication

## Feature Overview
**What is this feature?**  
A lightweight session-based authentication system that secures the voice AI chat backend with minimal implementation complexity. Users authenticate with username/password, and the backend maintains secure sessions while keeping API keys server-side only. This provides **significantly better security** than client-side API keys for **proof-of-concept deployment on public cloud infrastructure**.

**Who is it for?**  
- **POC/Demo environments** running on public cloud infrastructure
- Developers showcasing voice AI capabilities to stakeholders
- Teams needing **secure yet simple** access control for temporary/experimental deployments
- **Advantage**: Much safer than client-side API keys while remaining POC-appropriate

---

## Goals & Success Criteria

- **Security Goal**: Prevent **casual unauthorized access** to AI chat and speech services
- **Compatibility Goal**: Work seamlessly across local development, Docker containers, and Azure cloud deployments
- **Simplicity Goal**: Minimal code changes with maximum security benefit **for POC scenarios**
- **Performance Goal**: Authentication overhead under 5ms per request
- **Cost Protection Goal**: Prevent runaway Azure costs from API abuse
- **Success Criteria**: 
  - Deter casual unauthorized access to the POC
  - Zero impact on existing functionality when authenticated
  - Easy key rotation and management across environments
  - **Monitoring and alerting** for unusual usage patterns

---

## Requirements

### Functional Requirements
- **User management**: Multiple username/password pairs with per-user API access
- **Session management**: Short-lived tokens with rolling expiration (4-hour sessions)
- **Rate limiting**: Prevent abuse with configurable request limits per user
- **Middleware authentication**: Validate sessions on all protected API routes
- **Environment-specific configuration**: Users and settings per deployment environment
- **Frontend integration**: Login form with session state management
- **Error handling**: Clear messages for authentication failures, rate limits, expired sessions
- **Health check bypass**: `/api/health` endpoint remains public
- **Session storage abstraction**: Scalable session storage (in-memory → Redis ready)

### Non-Functional Requirements
- **Performance**: Authentication check under 5ms per request
- **Security**: Session secrets and user credentials stored securely (environment variables, Key Vault)
- **Usability**: Clear error messages for authentication failures, rate limits, and expired sessions
- **Maintainability**: Centralized authentication and session management logic
- **Deployment**: Works across all three deployment scenarios (local, Docker, Azure)
- **Scalability**: Session storage abstraction ready for Redis/database scaling

---

## Feature Design

### UI/UX
**Minimal UI changes required** - simple login flow:
- **Login form**: Username/password fields (appears before chat interface)
- **Session management**: Automatic login state persistence
- **Logout option**: Simple logout button in header/menu
- **Error handling**: Clear messages for invalid credentials or expired sessions
- **Loading states**: Standard login processing indicators
- **Responsive**: Works on mobile and desktop

### Backend / Data
**New Components:**
- Authentication middleware (`authMiddleware.ts`) - validates sessions
- Rate limiting middleware (`rateLimitMiddleware.ts`) - prevents abuse
- Session management service (`sessionService.ts`) - creates/validates sessions with rolling expiration
- User credentials service (`userService.ts`) - validates username/password with per-user settings
- Session storage abstraction (`sessionStore.ts`) - in-memory implementation (Redis-ready)
- Authentication routes (`/api/auth/login`, `/api/auth/logout`, `/api/auth/status`)

**API Changes:**
- **Login endpoint**: `POST /api/auth/login` (username/password → secure session cookie)
- **Logout endpoint**: `POST /api/auth/logout` (clears session)
- **Status endpoint**: `GET /api/auth/status` (check current session)
- **Session validation**: All routes check for valid session cookies with rolling expiration
- **Rate limiting**: Per-user request limits with configurable overrides
- **Health check bypass**: `/api/health` remains public
- **HTTP 401/429 responses**: For invalid/missing sessions and rate limit exceeded

**Data Models:**
```typescript
interface AuthConfig {
  sessionSecret: string;
  sessionDurationHours: number; // Default: 4 hours
  rateLimitPerMinute: number; // Default: 100 requests/minute
  users: Array<{
    username: string;
    password: string;
    apiKey?: string; // Optional per-user API key
    rateLimitOverride?: number; // Custom rate limit for this user
  }>;
  enabled: boolean;
}

interface UserSession {
  sessionId: string;
  userId: string;
  username: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date; // For rolling expiration
  requestCount: number; // For rate limiting
  lastRequestTime: Date;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface SessionStore {
  get(sessionId: string): Promise<UserSession | null>;
  set(sessionId: string, session: UserSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<void>; // Remove expired sessions
}
```

---

## Implementation Plan

### Step 1: Backend Authentication Infrastructure
**Goal**: Create core authentication middleware and services
**Deliverables**:
- Create `server/src/middleware/authMiddleware.ts` with session validation
- Create `server/src/middleware/rateLimitMiddleware.ts` for request limiting
- Create `server/src/services/sessionService.ts` for session management with rolling expiration
- Create `server/src/services/userService.ts` for user validation with per-user settings
- Create `server/src/storage/sessionStore.ts` with in-memory implementation (Redis-ready interface)
- Update `server/src/config/env.ts` to include enhanced auth configuration

**Environment Configuration**:
- Local: Multiple users in `.env` file or JSON config
- Docker: Users configuration via environment variables or mounted config file
- Azure: User credentials stored in Azure Key Vault

### Step 2: Rate Limiting and Session Management
**Goal**: Implement rate limiting and rolling session expiration
**Deliverables**:
- Implement rate limiting middleware with per-user limits
- Add rolling session expiration (extends on activity)
- Create session cleanup job for expired sessions
- Add authentication routes (`/api/auth/login`, `/api/auth/logout`, `/api/auth/status`)
- Configure session storage abstraction for future scalability

### Step 3: Route Protection Implementation
**Goal**: Apply authentication and rate limiting to all API routes
**Deliverables**:
- Update `server/src/index.ts` to use auth and rate limiting middleware globally
- Exclude health check endpoint from authentication
- Add proper error handling for auth failures and rate limits
- Test authentication across all existing routes
- Add session activity logging

### Step 4: Frontend Authentication Integration
**Goal**: Create login UI and session management
**Deliverables**:
- Create `client/src/components/LoginForm.tsx` with username/password fields
- Create `client/src/context/AuthContext.tsx` for authentication state management
- Update `client/src/App.tsx` to handle login/logout flow
- Create `client/src/utils/apiClient.ts` for session-based HTTP client
- Add automatic session renewal and logout on expiry

### Step 5: Environment Configuration and Testing
**Goal**: Configure authentication for all deployment scenarios with enhanced features
**Deliverables**:
- **Local Development**: Multi-user configuration in `.env` or config file
- **Docker**: User configuration via `docker-compose.yml` or mounted config
- **Azure**: User credentials and settings in Azure Key Vault
- Comprehensive testing across all environments
- Performance testing with rate limiting
- Documentation for user management and configuration

---

## Testing & Validation

### Unit Tests
- `authMiddleware.ts`: Valid/invalid session scenarios, session expiration
- `rateLimitMiddleware.ts`: Rate limiting logic and per-user overrides
- `sessionService.ts`: Session creation, validation, rolling expiration
- `userService.ts`: User authentication and per-user settings
- `sessionStore.ts`: Session storage operations and cleanup

### Integration Tests
- End-to-end authentication flow for chat functionality
- Speech service authentication with sessions
- Evaluation service authentication with sessions
- Rate limiting enforcement across different users
- Session expiration and automatic renewal
- Error handling for authentication failures and rate limits

### Manual Testing
- **Local**: Start with `run-dev.bat`, verify login flow and session management
- **Docker**: Deploy with `docker-compose up`, test multi-user authentication
- **Azure**: Deploy to cloud, verify Key Vault integration and session security
- Cross-browser testing for login form and session persistence
- Rate limiting testing with multiple users
- Session expiration and renewal testing

### Acceptance Criteria
- All API endpoints (except health check) require valid session authentication
- Login form provides clear user experience with proper error handling
- Rate limiting prevents abuse while allowing normal usage
- Sessions automatically renew on activity and expire when inactive
- Performance impact under 5ms per request
- Successful deployment across all three environments
- Multiple users can authenticate simultaneously with different rate limits

---

## Additional Notes

### Security Considerations for POC
- **Session secrets**: 64+ character random strings for signing sessions
- **Password security**: Use strong passwords for demo accounts
- **HTTPS required**: Secure session cookies require HTTPS in production
- **Session duration**: 4-hour default with rolling expiration on activity
- **Rate limiting**: Prevents cost overruns from API abuse
- **User separation**: Per-user rate limits and optional API key overrides

### Environment Variables Required
```bash
# Local Development (.env)
AUTH_ENABLED=true
SESSION_SECRET=your-64-character-session-secret-here
SESSION_DURATION_HOURS=4
RATE_LIMIT_PER_MINUTE=100

# Users can be in .env or separate config file
AUTH_USERS='[{"username":"demo","password":"demo123","rateLimitOverride":200},{"username":"admin","password":"admin456"}]'

# Docker (docker-compose.yml)
AUTH_ENABLED=true
SESSION_SECRET=your-64-character-session-secret-here
SESSION_DURATION_HOURS=4
RATE_LIMIT_PER_MINUTE=100
AUTH_USERS='[{"username":"demo","password":"demo123"},{"username":"stakeholder","password":"secure789"}]'

# Azure (Key Vault)
auth-enabled: true
session-secret: your-64-character-session-secret-here
session-duration-hours: 4
rate-limit-per-minute: 100
auth-users: '[{"username":"demo","password":"demo123"},{"username":"client","password":"presentation456"}]'
```

### Migration Path
1. Deploy with `AUTH_ENABLED=false` initially
2. Configure users and session settings in all environments
3. Test authentication with existing functionality
4. Enable authentication (`AUTH_ENABLED=true`)
5. Monitor usage and adjust rate limits as needed

### POC Best Practices
- **Multiple demo accounts**: Different users for different stakeholders
- **Monitor usage**: Track session activity and API usage through Azure Application Insights
- **Set spending limits**: Configure Azure spending alerts to prevent cost surprises
- **Document access**: Provide clear instructions for stakeholders on how to access the POC
- **Plan for scaling**: Session storage abstraction allows easy migration to Redis/database

### Future Enhancements
- **Redis session storage**: For multi-instance deployments
- **Azure AD integration**: Enterprise authentication if POC becomes production
- **Audit logging**: Track user actions and API usage
- **Advanced rate limiting**: Different limits for different API endpoints