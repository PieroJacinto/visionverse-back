import axios from 'axios';
import diditAuthService from '../services/diditAuthService.js';
import { verifyWebhookSignature } from '../utils/webhookVerification.js';

export const initiateKYC = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const headers = await diditAuthService.getAuthorizationHeaders();
    const verificationURL = diditAuthService.getVerificationURL();
    const sessionEndpoint = `${verificationURL}/v1/session/`;
    
    const callbackUrl = process.env.NODE_ENV === 'production'
      ? `${process.env.BACKEND_URL_PROD}/api/auth/kyc/callback`
      : `${process.env.BACKEND_URL_DEV}/api/auth/kyc/callback`;

    console.log('Making KYC session request:', {
      url: sessionEndpoint,
      headers: {
        ...headers,
        Authorization: 'Bearer [REDACTED]'
      }
    });

    const response = await axios({
      method: 'POST',
      url: sessionEndpoint,
      headers: {
        ...headers,
        'Accept': 'application/json'
      },
      data: {
        callback: callbackUrl,
        vendor_data: req.user.id.toString(),
        features: 'OCR + FACE'
      },
      timeout: 10000,
      validateStatus: null
    });

    console.log('Didit API Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });

    if (response.status !== 201) {
      throw new Error(`API responded with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    req.session.kycSessionId = response.data.session_id;

    res.json({
      verificationUrl: response.data.url,
      sessionId: response.data.session_id
    });
  } catch (error) {
    console.error('Error initiating KYC:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headers: error.config?.headers
      }
    });
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to initiate KYC verification',
      details: error.response?.data || error.message,
      code: error.response?.status
    });
  }
};

export const handleCallback = async (req, res) => {
  try {
    const { session_id, status } = req.body;

    const signature = req.headers['x-didit-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const isValid = verifyWebhookSignature(
      req.body,
      signature,
      process.env.DIDIT_WEBHOOK_SECRET
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const headers = await diditAuthService.getAuthorizationHeaders();
    const baseURL = process.env.DIDIT_API_URL || 'https://verification.didit.me';
    
    const sessionResponse = await axios.get(
      `${baseURL}/v1/session/${session_id}`,
      { headers }
    );

    if (req.session?.passport?.user) {
      req.session.passport.user.kycStatus = sessionResponse.data.status;
      req.session.passport.user.kycVerified = sessionResponse.data.status === 'APPROVED';
      await new Promise((resolve) => req.session.save(resolve));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling KYC callback:', error);
    res.status(500).json({ 
      error: 'Failed to process KYC callback',
      details: error.message
    });
  }
};

export const checkKYCStatus = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const headers = await diditAuthService.getAuthorizationHeaders();
    const baseURL = process.env.DIDIT_API_URL || 'https://verification.didit.me';

    if (req.session.kycSessionId) {
      const response = await axios.get(
        `${baseURL}/v1/session/${req.session.kycSessionId}`,
        { headers }
      );

      return res.json({
        kycStatus: response.data.status,
        kycVerified: response.data.status === 'APPROVED'
      });
    }

    res.json({
      kycStatus: req.user.kycStatus || 'PENDING',
      kycVerified: req.user.kycVerified || false
    });
  } catch (error) {
    console.error('Error checking KYC status:', error);
    res.status(500).json({ 
      error: 'Failed to check KYC status',
      details: error.message
    });
  }
}