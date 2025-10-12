-- إضافة فهارس لتحسين أداء قاعدة البيانات

-- فهارس جدول Guest
CREATE INDEX IF NOT EXISTS idx_guests_national_id ON guests(national_id);
CREATE INDEX IF NOT EXISTS idx_guests_passport_no ON guests(passport_no);
CREATE INDEX IF NOT EXISTS idx_guests_restaurant_id ON guests(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_guests_check_in_date ON guests(check_in_date);
CREATE INDEX IF NOT EXISTS idx_guests_check_out_date ON guests(check_out_date);
CREATE INDEX IF NOT EXISTS idx_guests_created_by ON guests(created_by);
CREATE INDEX IF NOT EXISTS idx_guests_is_active ON guests(is_active);
CREATE INDEX IF NOT EXISTS idx_guests_created_at ON guests(created_at);

-- فهارس جدول Card
CREATE INDEX IF NOT EXISTS idx_cards_guest_id ON cards(guest_id);
CREATE INDEX IF NOT EXISTS idx_cards_meal_time_id ON cards(meal_time_id);
CREATE INDEX IF NOT EXISTS idx_cards_valid_from ON cards(valid_from);
CREATE INDEX IF NOT EXISTS idx_cards_valid_to ON cards(valid_to);
CREATE INDEX IF NOT EXISTS idx_cards_is_active ON cards(is_active);
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_created_by ON cards(created_by);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);

-- فهارس جدول AccessLog
CREATE INDEX IF NOT EXISTS idx_access_logs_gate_id ON access_logs(gate_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_card_id ON access_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_guest_id ON access_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_scan_time ON access_logs(scan_time);
CREATE INDEX IF NOT EXISTS idx_access_logs_is_success ON access_logs(is_success);

-- فهارس جدول ScanLog
CREATE INDEX IF NOT EXISTS idx_scan_logs_card_id ON scan_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_guest_id ON scan_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_time ON scan_logs(scan_time);
CREATE INDEX IF NOT EXISTS idx_scan_logs_is_success ON scan_logs(is_success);

-- فهارس جدول Restaurant
CREATE INDEX IF NOT EXISTS idx_restaurants_gate_id ON restaurants(gate_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_restaurant_type ON restaurants(restaurant_type);

-- فهارس جدول MealTime
CREATE INDEX IF NOT EXISTS idx_meal_times_restaurant_id ON meal_times(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_meal_times_is_active ON meal_times(is_active);

-- فهارس جدول User
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- فهارس جدول AuditLog
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- فهارس مركبة لتحسين الاستعلامات المعقدة
CREATE INDEX IF NOT EXISTS idx_cards_guest_valid_dates ON cards(guest_id, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_access_logs_gate_time ON access_logs(gate_id, scan_time);
CREATE INDEX IF NOT EXISTS idx_guests_restaurant_active ON guests(restaurant_id, is_active);