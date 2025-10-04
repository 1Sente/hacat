import axios, { AxiosInstance } from 'axios';

interface SecretData {
  [key: string]: any;
}

interface OpenBaoResponse {
  data: SecretData;
}

class OpenBaoService {
  private client: AxiosInstance;
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = process.env.OPENBAO_URL || 'http://localhost:8200';
    this.token = process.env.OPENBAO_TOKEN || 'root-token';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Vault-Token': this.token,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Store a secret in OpenBao
   * @param name - Secret name/path
   * @param data - Secret data to store
   */
  async setSecret(name: string, data: SecretData): Promise<void> {
    try {
      console.log(`Storing secret: ${name}`);
      
      const response = await this.client.post(`/v1/secret/data/${name}`, {
        data: data
      });

      if (response.status === 200 || response.status === 204) {
        console.log(`Secret ${name} stored successfully`);
      } else {
        throw new Error(`Failed to store secret: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error storing secret ${name}:`, error);
      throw new Error(`Failed to store secret ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve a secret from OpenBao
   * @param name - Secret name/path
   * @returns Secret data
   */
  async getSecret(name: string): Promise<SecretData> {
    try {
      console.log(`Retrieving secret: ${name}`);
      
      const response = await this.client.get<OpenBaoResponse>(`/v1/secret/data/${name}`);
      
      if (response.data && response.data.data) {
        console.log(`Secret ${name} retrieved successfully`);
        return response.data.data;
      } else {
        throw new Error(`Secret ${name} not found or invalid response format`);
      }
    } catch (error) {
      console.error(`Error retrieving secret ${name}:`, error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`Secret ${name} not found`);
      }
      throw new Error(`Failed to retrieve secret ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if OpenBao is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/v1/sys/health');
      return response.status === 200;
    } catch (error) {
      console.error('OpenBao health check failed:', error);
      return false;
    }
  }

  /**
   * List all secrets (if permissions allow)
   */
  async listSecrets(): Promise<string[]> {
    try {
      const response = await this.client.get('/v1/secret/metadata?list=true');
      return response.data?.data?.keys || [];
    } catch (error) {
      console.error('Error listing secrets:', error);
      throw new Error(`Failed to list secrets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const openBaoService = new OpenBaoService();

// Export individual functions for convenience
export const setSecret = (name: string, data: SecretData) => openBaoService.setSecret(name, data);
export const getSecret = (name: string) => openBaoService.getSecret(name);
export const healthCheck = () => openBaoService.healthCheck();
