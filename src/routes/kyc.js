import express from 'express';
import { initiateKYC, handleCallback, checkKYCStatus } from '../controllers/kycController.js';

const router = express.Router();

router.post('/initiate', initiateKYC);
router.post('/callback', handleCallback);
router.get('/status', checkKYCStatus);

export default router;