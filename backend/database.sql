-- Activer l'extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer les types ENUM pour les rôles et les statuts
CREATE TYPE user_role AS ENUM ('PME', 'GRAND_GROUPE', 'FINANCIER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('PENDING_VALIDATION', 'ACTIVE', 'SUSPENDED');
CREATE TYPE invoice_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FUNDED', 'PAID');
CREATE TYPE offer_status AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REJETEE');

-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    company_name VARCHAR(255),
    company_details JSONB,
    bank_details JSONB,
    status user_status,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des factures (créée AVANT la table des offres)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pme_id UUID NOT NULL REFERENCES users(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    invoice_number VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status DEFAULT 'PENDING_APPROVAL',
    file_url VARCHAR(255),
    -- Cette colonne sera ajoutée plus tard pour éviter un problème de dépendance circulaire
    -- winning_offer_id UUID REFERENCES offers(id), 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des offres
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    financier_id UUID NOT NULL REFERENCES users(id),
    discount_rate DECIMAL(5, 2) NOT NULL, -- ex: 2.50 pour 2.50%
    status offer_status DEFAULT 'EN_ATTENTE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- On ajoute la colonne de l'offre gagnante à la table des factures APRES que la table des offres soit créée
ALTER TABLE invoices ADD COLUMN winning_offer_id UUID REFERENCES offers(id);


-- Table des transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    financier_id UUID NOT NULL REFERENCES users(id),
    financed_amount DECIMAL(12, 2),
    platform_fee DECIMAL(12, 2),
    transaction_date TIMESTAMPTZ DEFAULT NOW()
);

-- Table des notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_link VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);