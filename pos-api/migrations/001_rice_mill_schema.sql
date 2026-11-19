-- ============================================================
-- Jaliya Rice Mill — Complete Database Schema
-- Database: rice_mill
-- Run once on a fresh empty database
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── Auth & Access Control ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(191) NOT NULL,
  email    VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(191) NOT NULL,
  active   BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_role (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS features (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`      VARCHAR(191) NOT NULL UNIQUE,
  label      VARCHAR(191) NOT NULL,
  path       VARCHAR(191),
  `group`    VARCHAR(50),
  sort_order INT DEFAULT 0,
  icon       VARCHAR(32),
  offline_ok BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS role_features (
  role_id    BIGINT UNSIGNED NOT NULL,
  feature_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, feature_id)
);

CREATE TABLE IF NOT EXISTS user_features (
  user_id    BIGINT UNSIGNED NOT NULL,
  feature_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, feature_id)
);

CREATE TABLE IF NOT EXISTS settings (
  id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(191) NOT NULL UNIQUE,
  value LONGTEXT
);

-- ── Suppliers (paddy farmers + companies) ────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(191) NOT NULL,
  type            ENUM('company','farmer') DEFAULT 'company',
  phone           VARCHAR(50),
  email           VARCHAR(191),
  address         TEXT,
  opening_balance DECIMAL(12,2) DEFAULT 0,  -- payable at start
  payable_balance DECIMAL(12,2) DEFAULT 0,  -- running total
  active          BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Customers (wholesale rice buyers) ───────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(191) NOT NULL,
  phone           VARCHAR(50),
  email           VARCHAR(191),
  address         TEXT,
  opening_balance DECIMAL(12,2) DEFAULT 0,  -- receivable at start
  credit_balance  DECIMAL(12,2) DEFAULT 0,  -- running total
  active          BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Chart of Accounts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code      VARCHAR(20) NOT NULL UNIQUE,
  name      VARCHAR(191) NOT NULL,
  type      ENUM('asset','liability','equity','income','expense') NOT NULL,
  parent_id BIGINT UNSIGNED
);

-- ── Journal Entries (every cash/stock move posts here) ───────
CREATE TABLE IF NOT EXISTS journal_entries (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ref_no      VARCHAR(30) NOT NULL UNIQUE,
  date        DATE NOT NULL,
  description TEXT,
  source_type VARCHAR(50),   -- e.g. 'paddy_purchase', 'wholesale_sale', 'wage_settlement'
  source_id   BIGINT UNSIGNED,
  user_id     BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_id   BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  debit      DECIMAL(12,2) DEFAULT 0,
  credit     DECIMAL(12,2) DEFAULT 0,
  note       VARCHAR(255)
);

-- ── Cash / Bank Accounts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_accounts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(191) NOT NULL,
  type            ENUM('cash','bank') NOT NULL DEFAULT 'cash',
  bank_name       VARCHAR(100),
  account_no      VARCHAR(100),
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  active          BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Paddy Varieties (input types) ───────────────────────────
CREATE TABLE IF NOT EXISTS paddy_varieties (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(191) NOT NULL,
  description TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Rice Grades (output: rice types + by-products) ───────────
CREATE TABLE IF NOT EXISTS rice_grades (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(191) NOT NULL,
  type          ENUM('rice','bran','husk','broken') NOT NULL DEFAULT 'rice',
  unit          VARCHAR(20) DEFAULT 'kg',
  current_stock DECIMAL(12,3) DEFAULT 0,
  opening_stock DECIMAL(12,3) DEFAULT 0,
  active        BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Paddy Purchases ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paddy_purchases (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lot_no         VARCHAR(50) NOT NULL UNIQUE,
  supplier_id    BIGINT UNSIGNED NOT NULL,
  variety_id     BIGINT UNSIGNED,
  purchase_date  DATE NOT NULL,
  quantity_kg    DECIMAL(12,3) NOT NULL,
  remaining_kg   DECIMAL(12,3) NOT NULL,  -- kg not yet milled
  price_per_kg   DECIMAL(10,4) NOT NULL,
  moisture_pct   DECIMAL(5,2) DEFAULT 0,
  total_amount   DECIMAL(12,2) NOT NULL,
  paid_amount    DECIMAL(12,2) DEFAULT 0,
  balance        DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  note           TEXT,
  user_id        BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paddy_purchase_payments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paddy_purchase_id BIGINT UNSIGNED NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  payment_method    ENUM('cash','bank_transfer') DEFAULT 'cash',
  cash_account_id   BIGINT UNSIGNED,
  bank_reference    VARCHAR(100),
  payment_date      DATE NOT NULL,
  note              VARCHAR(255),
  user_id           BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Mill Batches (production runs) ───────────────────────────
CREATE TABLE IF NOT EXISTS mill_batches (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_no      VARCHAR(50) NOT NULL UNIQUE,
  mill_date     DATE NOT NULL,
  paddy_qty_in  DECIMAL(12,3) NOT NULL,  -- total paddy consumed
  milling_cost  DECIMAL(10,2) DEFAULT 0,
  status        ENUM('open','completed') DEFAULT 'completed',
  note          TEXT,
  user_id       BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Which paddy lots fed this batch
CREATE TABLE IF NOT EXISTS mill_batch_inputs (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id          BIGINT UNSIGNED NOT NULL,
  paddy_purchase_id BIGINT UNSIGNED NOT NULL,
  quantity_kg       DECIMAL(12,3) NOT NULL
);

-- What came out of this batch (rice + by-products)
CREATE TABLE IF NOT EXISTS mill_batch_outputs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id      BIGINT UNSIGNED NOT NULL,
  rice_grade_id BIGINT UNSIGNED NOT NULL,
  quantity_kg   DECIMAL(12,3) NOT NULL,
  yield_pct     DECIMAL(5,2) DEFAULT 0  -- set by API: (qty / paddy_qty_in) * 100
);

-- ── Wholesale Sales ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wholesale_sales (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_no     VARCHAR(50) NOT NULL UNIQUE,
  customer_id    BIGINT UNSIGNED,
  sale_date      DATE NOT NULL,
  subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount       DECIMAL(12,2) DEFAULT 0,
  total          DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid           DECIMAL(12,2) DEFAULT 0,
  balance        DECIMAL(12,2) DEFAULT 0,
  payment_status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  note           TEXT,
  user_id        BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wholesale_sale_items (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id       BIGINT UNSIGNED NOT NULL,
  rice_grade_id BIGINT UNSIGNED NOT NULL,
  grade_name    VARCHAR(191) NOT NULL,
  quantity_kg   DECIMAL(12,3) NOT NULL,
  price_per_kg  DECIMAL(10,4) NOT NULL,
  total         DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS wholesale_sale_payments (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id         BIGINT UNSIGNED NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  payment_method  ENUM('cash','bank_transfer') DEFAULT 'cash',
  cash_account_id BIGINT UNSIGNED,
  bank_reference  VARCHAR(100),
  payment_date    DATE NOT NULL,
  note            VARCHAR(255),
  user_id         BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Labour Workers (daily wage) ──────────────────────────────
CREATE TABLE IF NOT EXISTS labour_workers (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(191) NOT NULL,
  phone           VARCHAR(50),
  address         TEXT,
  daily_rate      DECIMAL(10,2) NOT NULL DEFAULT 0,
  opening_advance DECIMAL(10,2) DEFAULT 0,  -- advance balance at setup
  advance_balance DECIMAL(10,2) DEFAULT 0,  -- running balance
  active          BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS labour_attendance (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  worker_id BIGINT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  status    ENUM('full','half','absent') DEFAULT 'full',
  note      VARCHAR(255),
  user_id   BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_worker_date (worker_id, work_date)
);

CREATE TABLE IF NOT EXISTS worker_advances (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  worker_id          BIGINT UNSIGNED NOT NULL,
  given_date         DATE NOT NULL,
  amount             DECIMAL(10,2) NOT NULL,
  note               VARCHAR(255),
  deducted           BOOLEAN DEFAULT FALSE,
  wage_settlement_id BIGINT UNSIGNED,
  given_by           BIGINT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wage_settlements (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ref_no          VARCHAR(50) NOT NULL UNIQUE,
  worker_id       BIGINT UNSIGNED NOT NULL,
  period_from     DATE NOT NULL,
  period_to       DATE NOT NULL,
  full_days       INT DEFAULT 0,
  half_days       INT DEFAULT 0,
  total_days      DECIMAL(5,1) DEFAULT 0,
  daily_rate      DECIMAL(10,2) NOT NULL,
  gross_wage      DECIMAL(10,2) NOT NULL,
  total_advances  DECIMAL(10,2) DEFAULT 0,
  net_payable     DECIMAL(10,2) NOT NULL,
  payment_method  ENUM('cash','bank_transfer') DEFAULT 'cash',
  cash_account_id BIGINT UNSIGNED,
  bank_reference  VARCHAR(100),
  note            VARCHAR(255),
  user_id         BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Opening Balances ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opening_balances (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type           ENUM('supplier_payable','customer_receivable','cash_account','rice_stock','worker_advance') NOT NULL,
  reference_id   BIGINT UNSIGNED NOT NULL,
  reference_name VARCHAR(191),
  amount         DECIMAL(12,2) DEFAULT 0,
  quantity_kg    DECIMAL(12,3) DEFAULT 0,
  posted         BOOLEAN DEFAULT FALSE,
  note           VARCHAR(255),
  user_id        BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- ── Default Chart of Accounts ────────────────────────────────
INSERT IGNORE INTO accounts (code, name, type) VALUES
  ('1000', 'Assets',                  'asset'),
  ('1100', 'Cash on Hand',            'asset'),
  ('1200', 'Bank Accounts',           'asset'),
  ('1300', 'Paddy Stock',             'asset'),
  ('1400', 'Rice Stock',              'asset'),
  ('1500', 'By-products Stock',       'asset'),
  ('1600', 'Worker Advances',         'asset'),
  ('1700', 'Customer Receivables',    'asset'),
  ('2000', 'Liabilities',             'liability'),
  ('2100', 'Supplier Payables',       'liability'),
  ('3000', 'Equity',                  'equity'),
  ('3100', 'Opening Capital',         'equity'),
  ('4000', 'Income',                  'income'),
  ('4100', 'Rice Sales',              'income'),
  ('4200', 'Bran Sales',              'income'),
  ('4300', 'Husk Sales',              'income'),
  ('4400', 'Broken Rice Sales',       'income'),
  ('5000', 'Expenses',                'expense'),
  ('5100', 'Paddy Purchase Cost',     'expense'),
  ('5200', 'Labour Cost',             'expense'),
  ('5300', 'Milling Cost',            'expense'),
  ('5400', 'Other Expenses',          'expense');

-- Parent links
UPDATE accounts SET parent_id = (SELECT id FROM (SELECT id FROM accounts WHERE code='1000') t) WHERE code IN ('1100','1200','1300','1400','1500','1600','1700');
UPDATE accounts SET parent_id = (SELECT id FROM (SELECT id FROM accounts WHERE code='2000') t) WHERE code = '2100';
UPDATE accounts SET parent_id = (SELECT id FROM (SELECT id FROM accounts WHERE code='3000') t) WHERE code = '3100';
UPDATE accounts SET parent_id = (SELECT id FROM (SELECT id FROM accounts WHERE code='4000') t) WHERE code IN ('4100','4200','4300','4400');
UPDATE accounts SET parent_id = (SELECT id FROM (SELECT id FROM accounts WHERE code='5000') t) WHERE code IN ('5100','5200','5300','5400');

-- Default roles
INSERT IGNORE INTO roles (name) VALUES ('Admin'), ('Manager'), ('Operator'), ('Accountant');

-- Default cash account
INSERT IGNORE INTO cash_accounts (name, type, opening_balance, current_balance) VALUES ('Cash on Hand', 'cash', 0, 0);
