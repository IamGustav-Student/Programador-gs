const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { getConnection, sql } = require('../db');
require('dotenv').config();

// Configuración Inicial de Mercado Pago con Token Maestro de Programador GS
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

/**
 * Nueva Función: Renderiza o valida la información antes de generar la preferencia SaaS
 */
const renderSaaSPricing = async (req, res) => {
    const { tenantId, planId } = req.query;

    if (!tenantId || !planId) {
        return res.status(400).send("Faltan parámetros obligatorios (tenantId, planId).");
    }

    try {
        const pool = await getConnection();
        
        // Buscamos el Tenant y el Plan en la base de datos de GymSaaS
        const tenantResult = await pool.request()
            .input('tid', sql.NVarChar, tenantId)
            .query('SELECT Name, Email FROM Tenants WHERE Id = @tid');

        const planResult = await pool.request()
            .input('pid', sql.Int, planId)
            .query('SELECT * FROM SaaS_Plans WHERE PlanEnumId = @pid');

        if (tenantResult.recordset.length === 0 || planResult.recordset.length === 0) {
            return res.status(404).json({ error: "Gimnasio o Plan no encontrado." });
        }

        const tenant = tenantResult.recordset[0];
        const plan = planResult.recordset[0];

        // En una implementación con EJS/Vistas, aquí haríamos res.render('checkout', { ... })
        // Para esta fase, devolvemos la data para que el front de ProgramadorGS la procese
        res.json({
            tenant: tenant,
            plan: plan,
            gateway_message: "Listo para procesar pago centralizado"
        });
    } catch (error) {
        console.error("Error en renderSaaSPricing:", error);
        res.status(500).send("Error interno del servidor.");
    }
};

const createPreference = async (req, res) => {
    const { tenantId, planEnumId, price, title, emailGimnasio } = req.body;

    if (!tenantId || !planEnumId || !price) {
        return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    try {
        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: String(planEnumId),
                        title: `Suscripción Gymvo: ${title}`,
                        quantity: 1,
                        unit_price: Number(price),
                        currency_id: 'ARS'
                    }
                ],
                payer: {
                    email: emailGimnasio || 'admin-gym@gymvo.com'
                },
                external_reference: JSON.stringify({ 
                    tenantId: tenantId, 
                    planEnumId: Number(planEnumId) 
                }),
                back_urls: {
                    // Retorno directo a GymSaaS para mantener la sesión del usuario
                    success: `${process.env.GYMVO_URL}/Subscription/Success`,
                    failure: `${process.env.GYMVO_URL}/Subscription/Failure`,
                    pending: `${process.env.GYMVO_URL}/Subscription/Pending`
                },
                auto_return: "approved",
                notification_url: `${process.env.PAYMENT_SERVICE_URL}/api/webhook`,
                statement_descriptor: "GYMVO SAAS"
            }
        });

        res.json({ 
            preferenceId: result.id, 
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point 
        });

    } catch (error) {
        console.error("Error creando preferencia MP:", error);
        res.status(500).json({ error: "No se pudo generar el enlace de pago." });
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
                const amount = paymentData.transaction_amount;

                const pool = await getConnection();
                const transaction = new sql.Transaction(pool);
                await transaction.begin();

                try {
                    // Actualizamos la tabla Tenants de GymSaaS (Core)
                    // Status 1 = Active, Plan coincide con Enum de C#
                    const updateTenantQuery = `
                        UPDATE Tenants 
                        SET SubscriptionEndsAt = DATEADD(DAY, 30, GETDATE()),
                            Status = 1,
                            Plan = @plan,
                            IsActive = 1
                        WHERE Id = @tid`;
                    
                    await transaction.request()
                        .input('tid', sql.NVarChar, tenantId)
                        .input('plan', sql.Int, planEnumId)
                        .query(updateTenantQuery);

                    // Registro en historial SaaS de Programador GS
                    const insertHistoryQuery = `
                        INSERT INTO SaaS_Payments (TenantId, Amount, PlanName, MercadoPagoReference, Status, PaymentDate)
                        VALUES (@tid, @amount, @pname, @ref, 'Approved', GETDATE())`;

                    await transaction.request()
                        .input('tid', sql.NVarChar, tenantId)
                        .input('amount', sql.Decimal(18, 2), amount)
                        .input('pname', sql.NVarChar, `Plan ID ${planEnumId}`)
                        .input('ref', sql.NVarChar, String(paymentId))
                        .query(insertHistoryQuery);

                    await transaction.commit();
                } catch (dbError) {
                    await transaction.rollback();
                    throw dbError;
                }
            }
        } catch (error) {
            console.error("❌ Error procesando Webhook:", error);
            return res.sendStatus(500);
        }
    }
    res.sendStatus(200);
};

module.exports = {
    getCheckoutInfo,
    renderSaaSPricing,
    createPreference,
    handleWebhook
};