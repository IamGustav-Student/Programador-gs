// server/server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('client')); // Servir archivos estáticos del frontend

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'gustavo_admin',
  password: process.env.DB_PASSWORD || 'pgs_password_2026',
  database: process.env.DB_NAME || 'programador_gs_db',
  port: 5432,
});

// Ruta de prueba de conexión
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'online', time: result.rows[0].now, message: 'Programador GS API lista.' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Programador GS corriendo en puerto ${PORT}`);
});