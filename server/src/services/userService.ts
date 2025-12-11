import { AuthUser } from '../types/auth';
import { authConfig } from '../config/env';

class UserService {
  validateUser(username: string, password: string): AuthUser | null {
    return authConfig.users.find(
      (u) => u.username === username && u.password === password
    ) || null;
  }
}

export const userService = new UserService();
