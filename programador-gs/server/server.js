const express = require('express');
const cors = require('cors');
const path = require('path');
const { getConnection } = require('./db');
require('dotenv').config();

const paymentRoutes = require('./routes/payment.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del cliente
app.use(express.static(path.join(__dirname, '../client')));

// Rutas API
app.use('/api', paymentRoutes);

// Ruta para el Checkout Visual
app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/checkout-saas.html'));
});

// Healthcheck
app.get('/api/status', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT @@VERSION as version');
        res.json({ 
            status: 'online', 
            service: 'Programador GS Payment Gateway',
            database: 'Connected',
            db_version: result.recordset[0].version
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Programador GS Payment Service Activo`);
    console.log(`🔌 Puerto: ${PORT}`);
    console.log(`==================================================`);
});