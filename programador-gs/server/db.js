const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_HOST,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false, // Importante para contenedores Docker sin SSL oficial
        trustServerCertificate: true // Confiar en certificado local
    }
};

const getConnection = async () => {
    try {
        const pool = await sql.connect(dbConfig);
        return pool;
    } catch (err) {
        console.error('❌ Error fatal conectando a SQL Server:', err);
        throw err;
    }
};

module.exports = {
    getConnection,
    sql 
};