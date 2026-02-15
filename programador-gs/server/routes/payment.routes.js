const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Obtener info básica para el frontend
router.get('/checkout-info/:tenantId', paymentController.getCheckoutInfo);

// Endpoint de entrada desde GymSaaS para iniciar flujo SaaS
router.get('/checkout/saas', paymentController.renderSaaSPricing);

// Crear preferencia de pago
router.post('/create-preference', paymentController.createPreference);

// Webhook para Mercado Pago (Notificaciones IPN)
router.post('/webhook', paymentController.handleWebhook);
// Nueva ruta para verificación de estado desde el cliente
router.get('/payment-status/:tenantId', paymentController.verifyPaymentStatus);

module.exports = router;