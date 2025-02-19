import axios from 'axios';

class DiditAuthService {
  constructor() {
    // URL base para la verificación
    this.verificationURL = process.env.DIDIT_VERIFICATION_URL || 'https://verification.didit.me';
    // URL base para la autenticación
    this.authURL = process.env.DIDIT_AUTH_URL || 'https://apx.didit.me';
    this.accessToken = null;
    this.tokenExpiration = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiration && Date.now() < this.tokenExpiration) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${process.env.DIDIT_CLIENT_ID}:${process.env.DIDIT_CLIENT_SECRET}`
      ).toString('base64');

      console.log('Attempting to get access token from:', `${this.authURL}/auth/v2/token`);

      const response = await axios({
        method: 'post',
        url: `${this.authURL}/auth/v2/token`,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        data: 'grant_type=client_credentials'
      });

      console.log('Token response status:', response.status);

      this.accessToken = response.data.access_token;
      this.tokenExpiration = Date.now() + (response.data.expires_in * 1000) - (5 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error obtaining Didit access token:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        headers: error.config?.headers
      });
      throw new Error('Failed to obtain Didit access token');
    }
  }

  async getAuthorizationHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  getVerificationURL() {
    return this.verificationURL;
  }
}

export default new DiditAuthService();