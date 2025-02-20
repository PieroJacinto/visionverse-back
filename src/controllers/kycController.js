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
    
    // Construir la URL base correctamente
    const baseUrl = process.env.NODE_ENV === 'production'
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BACKEND_URL_DEV || 'http://localhost:3000';
    
    const callbackUrl = `${baseUrl}/api/auth/kyc/callback`;
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL_PROD
      : process.env.FRONTEND_URL_DEV;

    console.log('Making KYC session request with:', {
      callbackUrl,
      frontendUrl,
      baseUrl
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
        features: 'OCR + FACE',
        redirect_url: `${frontendUrl}/welcome`
      },
      timeout: 10000,
      validateStatus: null
    });

    console.log('KYC session response:', {
      status: response.status,
      data: response.data,
      requestedCallback: callbackUrl,
      requestedRedirect: `${frontendUrl}/welcome`
    });

    if (response.status !== 201) {
      throw new Error(`API responded with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    // Guardar información importante en la sesión
    req.session.kycSessionId = response.data.session_id;
    req.session.kycRedirectUrl = `${frontendUrl}/welcome`;
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
    console.log('Received KYC callback:', { session_id, status, body: req.body });

    const signature = req.headers['x-didit-signature'];
    if (!signature) {
      console.error('Missing signature in callback');
      return res.status(401).json({ error: 'Missing signature' });
    }

    const isValid = verifyWebhookSignature(
      req.body,
      signature,
      process.env.DIDIT_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error('Invalid signature in callback');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const headers = await diditAuthService.getAuthorizationHeaders();
    const baseURL = process.env.DIDIT_API_URL || 'https://verification.didit.me';
    
    const sessionResponse = await axios.get(
      `${baseURL}/v1/session/${session_id}`,
      { headers }
    );

    console.log('Session verification response:', sessionResponse.data);

    // Determinar la URL de redirección
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL_PROD
      : process.env.FRONTEND_URL_DEV;
    
    const redirectUrl = `${frontendUrl}/welcome?kycStatus=${sessionResponse.data.status}`;

    // Actualizar el estado KYC en la sesión del usuario si existe
    if (req.session?.passport?.user) {
      req.session.passport.user.kycStatus = sessionResponse.data.status;
      req.session.passport.user.kycVerified = sessionResponse.data.status === 'APPROVED';
      await saveSession(req.session);
    }

    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling KYC callback:', error);
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL_PROD
      : process.env.FRONTEND_URL_DEV;
    res.redirect(`${frontendUrl}/welcome?error=true`);
  }
};

export const checkKYCStatus = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const headers = await diditAuthService.getAuthorizationHeaders();
    const baseURL = process.env.DIDIT_API_URL || 'https://verification.didit.me';

    // Si hay una sesión KYC activa, obtener su estado
    if (req.session.kycSessionId) {
      const response = await axios.get(
        `${baseURL}/v1/session/${req.session.kycSessionId}`,
        { headers }
      );

      console.log('KYC status check response:', response.data);

      return res.json({
        kycStatus: response.data.status,
        kycVerified: response.data.status === 'APPROVED',
        sessionId: req.session.kycSessionId
      });
    }

    // Si no hay sesión activa, devolver el estado almacenado en el usuario
    res.json({
      kycStatus: req.user.kycStatus || 'PENDING',
      kycVerified: req.user.kycVerified || false,
      sessionId: null
    });
  } catch (error) {
    console.error('Error checking KYC status:', error);
    res.status(500).json({ 
      error: 'Failed to check KYC status',
      details: error.message
    });
  }
};