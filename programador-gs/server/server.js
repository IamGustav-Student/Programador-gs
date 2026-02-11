const express = require('express');
const cors = require('cors');
const { getConnection } = require('./db');
require('dotenv').config();

// Importar Rutas
const paymentRoutes = require('./routes/payment.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas API
app.use('/api', paymentRoutes);

// Healthcheck (Estado del sistema)
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
        console.error("Error en healthcheck:", err);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Programador GS Payment Service Activo`);
    console.log(`🔌 Puerto: ${PORT}`);
    console.log(`💳 Modo: ${process.env.NODE_ENV || 'Development'}`);
    console.log(`==================================================`);
});