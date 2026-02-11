-- =============================================
-- MIGRACIÓN SEGURA PARA GYMVO SAAS PAYMENTS
-- =============================================

-- 1. Tabla de Configuración de Precios (Para que Node.js sepa cuánto cobrar)
-- No afecta al sistema .NET, es solo informativa para el checkout.
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SaaS_Plans' AND xtype='U')
BEGIN
    CREATE TABLE SaaS_Plans (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EnumId INT NOT NULL, -- 1: Basico, 2: Premium (Debe coincidir con tu Enum PlanType en C#)
        Name NVARCHAR(50) NOT NULL, 
        Price DECIMAL(18, 2) NOT NULL,
        Description NVARCHAR(200) NULL,
        MercadoPagoId NVARCHAR(100) NULL
    );

    -- Insertar Precios Base (Ajusta los EnumId según tu código C# PlanType)
    -- Asumiendo: 1=Basico, 2=Premium, 3=Enterprise
    INSERT INTO SaaS_Plans (EnumId, Name, Price, Description) VALUES 
    (1, 'Plan Básico', 15000.00, 'Hasta 50 socios'),
    (2, 'Plan Premium', 25000.00, 'Socios Ilimitados'),
    (3, 'Plan Enterprise', 40000.00, 'Para cadenas y franquicias');
END

-- 2. Historial de Pagos del Tenant a la Plataforma
-- OJO: Gymvo tiene una tabla 'Pagos', pero es de Socios -> Gimnasio.
-- Esta tabla 'SaaS_Payments' es de Gimnasios -> Nosotros (SaaS).
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SaaS_Payments' AND xtype='U')
BEGIN
    CREATE TABLE SaaS_Payments (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId NVARCHAR(450) NOT NULL, -- ID del Gym (Guid string en tu sistema)
        Amount DECIMAL(18, 2) NOT NULL,
        PlanName NVARCHAR(50) NULL,
        PaymentDate DATETIME2 DEFAULT GETDATE(),
        MercadoPagoReference NVARCHAR(100) NULL, -- ID de pago MP
        Status NVARCHAR(20) DEFAULT 'Approved',
        
        -- Índice para búsquedas rápidas
        INDEX IX_SaaS_Payments_TenantId (TenantId)
    );
END