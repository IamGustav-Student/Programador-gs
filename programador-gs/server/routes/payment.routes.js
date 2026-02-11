const { Router } = require('express');
const { 
    getCheckoutInfo, 
    createPreference, 
    handleWebhook 
} = require('../controllers/payment.controller');

const router = Router();

// 1. Obtener datos del Gym y los Planes disponibles
// GET /api/checkout-info/GUID-DEL-TENANT
router.get('/checkout-info/:tenantId', getCheckoutInfo);

// 2. Crear la preferencia de pago en Mercado Pago
// POST /api/create-preference
router.post('/create-preference', createPreference);

// 3. Webhook para recibir notificación de Mercado Pago
// POST /api/webhook
router.post('/webhook', handleWebhook);

module.exports = router;