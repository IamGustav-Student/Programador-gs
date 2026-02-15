const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { getConnection, sql } = require('../db');
require('dotenv').config();

// Configuración Inicial con Token Maestro
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

const getCheckoutInfo = async (req, res) => {
    const { tenantId } = req.params;
    try {
        const pool = await getConnection();
        const tenantQuery = `SELECT Name, Code, Plan, SubscriptionEndsAt, IsActive FROM Tenants WHERE Id = @tid`;
        const tenantResult = await pool.request().input('tid', sql.NVarChar, tenantId).query(tenantQuery);
        if (tenantResult.recordset.length === 0) return res.status(404).json({ error: 'Gimnasio no encontrado.' });
        const plansQuery = `SELECT * FROM SaaS_Plans ORDER BY Price ASC`;
        const plansResult = await pool.request().query(plansQuery);
        res.json({ tenant: tenantResult.recordset[0], plans: plansResult.recordset });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener datos." });
    }
};

const renderSaaSPricing = async (req, res) => {
    const { tenantId, planId } = req.query;
    if (!tenantId || !planId) return res.status(400).send("Faltan parámetros obligatorios.");
    try {
        const pool = await getConnection();
        const tenantResult = await pool.request().input('tid', sql.NVarChar, tenantId).query('SELECT Name, Email FROM Tenants WHERE Id = @tid');
        const planResult = await pool.request().input('pid', sql.Int, planId).query('SELECT * FROM SaaS_Plans WHERE PlanEnumId = @pid');
        if (tenantResult.recordset.length === 0 || planResult.recordset.length === 0) return res.status(404).json({ error: "Datos no encontrados." });
        res.json({ tenant: tenantResult.recordset[0], plan: planResult.recordset[0] });
    } catch (error) {
        res.status(500).send("Error interno.");
    }
};

const createPreference = async (req, res) => {
    const { tenantId, planEnumId, price, title, emailGimnasio } = req.body;
    try {
        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ id: String(planEnumId), title: `Suscripción Gymvo: ${title}`, quantity: 1, unit_price: Number(price), currency_id: 'ARS' }],
                payer: { email: emailGimnasio || 'admin-gym@gymvo.com' },
                external_reference: JSON.stringify({ tenantId: tenantId, planEnumId: Number(planEnumId) }),
                back_urls: {
                    success: `${process.env.GYMVO_URL}/Subscription/Success`,
                    failure: `${process.env.GYMVO_URL}/Subscription/Failure`,
                    pending: `${process.env.GYMVO_URL}/Subscription/Pending`
                },
                auto_return: "approved",
                notification_url: `${process.env.PAYMENT_SERVICE_URL}/api/webhook`,
                statement_descriptor: "GYMVO SAAS"
            }
        });
        res.json({ preferenceId: result.id, init_point: result.init_point });
    } catch (error) {
        res.status(500).json({ error: "Error en pasarela." });
    }
};

const handleWebhook = async (req, res) => {
    const paymentId = req.query['data.id'] || req.query.id;
    const topic = req.query.topic || req.query.type;
    if (topic === 'payment' && paymentId) {
        try {
            const paymentClient = new Payment(client);
            const paymentData = await paymentClient.get({ id: paymentId });
            if (paymentData.status === 'approved') {
                const metadata = JSON.parse(paymentData.external_reference);
                const { tenantId, planEnumId } = metadata;
                const pool = await getConnection();
                const transaction = new sql.Transaction(pool);
                await transaction.begin();
                try {
                    const updateQuery = `UPDATE Tenants SET SubscriptionEndsAt = DATEADD(DAY, 30, GETDATE()), Status = 1, Plan = @plan, IsActive = 1 WHERE Id = @tid`;
                    await transaction.request().input('tid', sql.NVarChar, tenantId).input('plan', sql.Int, planEnumId).query(updateQuery);
                    
                    const logQuery = `INSERT INTO SaaS_Payments (TenantId, Amount, PlanName, MercadoPagoReference, Status, PaymentDate) VALUES (@tid, @amt, @pname, @ref, 'Approved', GETDATE())`;
                    await transaction.request()
                        .input('tid', sql.NVarChar, tenantId)
                        .input('amt', sql.Decimal(18, 2), paymentData.transaction_amount)
                        .input('pname', sql.NVarChar, `Plan ID ${planEnumId}`)
                        .input('ref', sql.NVarChar, String(paymentId))
                        .query(logQuery);

                    await transaction.commit();
                } catch (dbError) {
                    await transaction.rollback();
                    throw dbError;
                }
            }
        } catch (error) {
            return res.sendStatus(500);
        }
    }
    res.sendStatus(200);
};

// NUEVA FUNCIÓN: Permite al cliente consultar si el pago ya fue procesado por el webhook
const verifyPaymentStatus = async (req, res) => {
    const { tenantId } = req.params;
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('tid', sql.NVarChar, tenantId)
            .query('SELECT TOP 1 Status, PaymentDate FROM SaaS_Payments WHERE TenantId = @tid ORDER BY PaymentDate DESC');
        res.json(result.recordset.length > 0 ? result.recordset[0] : { status: 'pending' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getCheckoutInfo, renderSaaSPricing, createPreference, handleWebhook, verifyPaymentStatus };