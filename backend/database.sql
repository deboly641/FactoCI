-- Activer l'extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer les types ENUM pour les rôles et les statuts
CREATE TYPE user_role AS ENUM ('PME', 'GRAND_GROUPE', 'FINANCIER', 'ADMIN');
CREATE TYPE invoice_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FINANCED', 'PAID');

-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    company_name VARCHAR(255),
    company_details JSONB,
    bank_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des factures
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pme_id UUID NOT NULL REFERENCES users(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    invoice_number VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status DEFAULT 'PENDING_APPROVAL',
    file_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    financier_id UUID NOT NULL REFERENCES users(id),
    financed_amount DECIMAL(12, 2),
    platform_fee DECIMAL(12, 2),
    transaction_date TIMESTAMPTZ DEFAULT NOW()
);