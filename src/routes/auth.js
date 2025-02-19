import express from 'express';
import authController from '../controllers/authController.js';
import kycRoutes from "./kyc.js"

const router = express.Router();

// Rutas existentes
router.get('/check-auth', authController.checkAuth);
router.get('/google', authController.initiateGoogleAuth);
router.get('/google/callback', authController.handleGoogleCallback);
router.get('/facebook', authController.initiateFacebookAuth);
router.get('/facebook/callback', authController.handleFacebookCallback);
router.post('/logout', authController.logout);

// Nuevas rutas para Apple
router.get('/apple', authController.initiateAppleAuth);
router.post('/apple/callback', authController.handleAppleCallback); // Note que es POST para Apple
// Para pruebas en desarrollo
if (process.env.NODE_ENV === 'development') {
  router.get('/apple/test', authController.testAppleAuth);
}


router.use('/kyc', isAuthenticated, kycRoutes);

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}
export default router;