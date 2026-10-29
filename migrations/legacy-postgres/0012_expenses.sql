-- Expenses: center-scoped expense tracking linked to employees (Phase B Part 2)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    category VARCHAR(50) NOT NULL
        CHECK (category IN (
            'travel', 'food', 'office_supplies', 'utilities', 'rent',
            'salary', 'marketing', 'maintenance', 'training', 'transport',
            'communication', 'miscellaneous'
        )),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    description TEXT,
    receipt_url TEXT,
    receipt_name VARCHAR(255),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash'
        CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other')),
    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paid')),
    approval_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_center_date
    ON expenses(center_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_center_status
    ON expenses(center_id, status, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_center_employee
    ON expenses(center_id, employee_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_center_category
    ON expenses(center_id, category);

CREATE INDEX IF NOT EXISTS idx_expenses_employee
    ON expenses(employee_id);
