// kycController.js
import axios from 'axios';
import diditAuthService from '../services/diditAuthService.js';
import { verifyWebhookSignature } from '../utils/webhookVerification.js';

// Función helper para convertir session.save() a promesa
const saveSession = (session) => {
  return new Promise((resolve, reject) => {
    session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

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

    console.log('Making KYC session request with callback URL:', callbackUrl);

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
        features: 'OCR + FACE',
        redirect_url: `${process.env.FRONTEND_URL}/welcome`
      },
      timeout: 10000,
      validateStatus: null
    });

    console.log('KYC session response:', {
      status: response.status,
      data: response.data
    });

    if (response.status !== 201) {
      throw new Error(`API responded with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    // Guardar en la sesión
    req.session.kycSessionId = response.data.session_id;
    req.session.kycRedirectUrl = `${process.env.FRONTEND_URL}/welcome`;
    
    // Usar la función helper para guardar la sesión
    await saveSession(req.session);

    res.json({
      verificationUrl: response.data.url,
      sessionId: response.data.session_id
    });
  } catch (error) {
    console.error('Error initiating KYC:', error);
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to initiate KYC verification',
      details: error.response?.data || error.message
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
      // Usar la función helper para guardar la sesión
      await saveSession(req.session);
    }

    const redirectUrl = `${process.env.FRONTEND_URL}/welcome?kycStatus=${sessionResponse.data.status}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling KYC callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/welcome?error=true`);
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
};