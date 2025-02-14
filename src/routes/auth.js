import express from 'express';
import authController from '../controllers/authController.js';

const router = express.Router();

// Rutas de autenticación
router.get('/check-auth', authController.checkAuth);
router.get('/google', authController.initiateGoogleAuth);
router.get('/google/callback', authController.handleGoogleCallback);
router.get('/logout', authController.logout);

export default router;