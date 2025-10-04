import axios, { AxiosInstance } from 'axios';

export interface UserInfo {
  sub: string;
  preferred_username: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [clientId: string]: {
      roles: string[];
    };
  };
}

export interface TokenValidationResult {
  valid: boolean;
  userInfo?: UserInfo;
  error?: string;
}

class KeycloakService {
  private client: AxiosInstance;
  private baseUrl: string;
  private realm: string;

  constructor() {
    this.baseUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = process.env.KEYCLOAK_REALM || 'master';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }

  /**
   * Verify JWT token via Keycloak userinfo endpoint
   * @param token - JWT token to verify
   * @returns User information if token is valid
   */
  async verifyToken(token: string): Promise<UserInfo> {
    try {
      console.log('Verifying token with Keycloak');
      
      const response = await this.client.get(`/realms/${this.realm}/protocol/openid-connect/userinfo`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data) {
        console.log(`Token verified for user: ${response.data.preferred_username}`);
        return response.data as UserInfo;
      } else {
        throw new Error('Invalid response from Keycloak');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid or expired token');
        } else if (error.response?.status === 403) {
          throw new Error('Access denied');
        } else if (error.response?.status >= 500) {
          throw new Error('Keycloak server error');
        }
      }
      
      throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user roles from token
   * @param userInfo - User information from token
   * @param clientId - Optional client ID for resource access
   * @returns Array of user roles
   */
  getUserRoles(userInfo: UserInfo, clientId?: string): string[] {
    const roles: string[] = [];

    // Realm roles
    if (userInfo.realm_access?.roles) {
      roles.push(...userInfo.realm_access.roles);
    }

    // Client-specific roles
    if (clientId && userInfo.resource_access?.[clientId]?.roles) {
      roles.push(...userInfo.resource_access[clientId].roles);
    }

    return roles;
  }

  /**
   * Check if user has specific role
   * @param userInfo - User information from token
   * @param role - Role to check
   * @param clientId - Optional client ID for resource access
   * @returns True if user has the role
   */
  hasRole(userInfo: UserInfo, role: string, clientId?: string): boolean {
    const roles = this.getUserRoles(userInfo, clientId);
    return roles.includes(role);
  }

  /**
   * Check if user is admin
   * @param userInfo - User information from token
   * @returns True if user is admin
   */
  isAdmin(userInfo: UserInfo): boolean {
    return this.hasRole(userInfo, 'admin') || this.hasRole(userInfo, 'realm-admin');
  }

  /**
   * Check if user is approver
   * @param userInfo - User information from token
   * @returns True if user is approver
   */
  isApprover(userInfo: UserInfo): boolean {
    return this.hasRole(userInfo, 'approver') || this.isAdmin(userInfo);
  }

  /**
   * Get token introspection (optional, more detailed validation)
   * @param token - JWT token to introspect
   * @returns Token introspection result
   */
  async introspectToken(token: string): Promise<any> {
    try {
      const response = await this.client.post(
        `/realms/${this.realm}/protocol/openid-connect/token/introspect`,
        new URLSearchParams({
          token: token,
          client_id: process.env.KEYCLOAK_CLIENT_ID || 'secretmanager-client'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Token introspection failed:', error);
      throw new Error(`Token introspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for Keycloak
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get(`/realms/${this.realm}`);
      return response.status === 200;
    } catch (error) {
      console.error('Keycloak health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const keycloakService = new KeycloakService();

// Export individual functions for convenience
export const verifyToken = (token: string) => keycloakService.verifyToken(token);
export const getUserRoles = (userInfo: UserInfo, clientId?: string) => keycloakService.getUserRoles(userInfo, clientId);
export const hasRole = (userInfo: UserInfo, role: string, clientId?: string) => keycloakService.hasRole(userInfo, role, clientId);
export const isAdmin = (userInfo: UserInfo) => keycloakService.isAdmin(userInfo);
export const isApprover = (userInfo: UserInfo) => keycloakService.isApprover(userInfo);
