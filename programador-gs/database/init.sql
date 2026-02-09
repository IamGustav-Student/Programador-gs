-- database/init.sql

-- Tabla de Usuarios (Para dueños de gimnasios y administración)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'client', -- 'admin', 'client'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Planes de Gymvo
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- 'Bronce', 'Plata', 'Oro'
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL, -- 30, 365
    features TEXT[] -- Array de características
);

-- Tabla de Suscripciones Activas
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_id INTEGER REFERENCES subscription_plans(id),
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'canceled'
    payment_id VARCHAR(100) -- ID de transacción de Mercado Pago
);

-- Datos iniciales para planes
INSERT INTO subscription_plans (name, price, duration_days, features) VALUES
('Bronce', 15000.00, 30, ARRAY['Gestión de socios', 'Control de pagos']),
('Plata', 25000.00, 30, ARRAY['Gestión de socios', 'Control de pagos', 'Rutinas digitales']),
('Oro', 40000.00, 30, ARRAY['Todo incluido', 'Control de acceso IoT', 'App personalizada']);