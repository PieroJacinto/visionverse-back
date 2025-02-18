import express from 'express';
import authController from '../controllers/authController.js';

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

export default router;