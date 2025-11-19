import db from './connection';

// Create all tables
export function createTables(): void {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            email TEXT,
            avatar TEXT,
            balance INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Server configurations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS server_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            cpu_cores INTEGER NOT NULL,
            ram_gb REAL NOT NULL,
            storage_gb INTEGER NOT NULL,
            storage_type TEXT DEFAULT 'NVMe SSD',
            bandwidth_gb INTEGER DEFAULT 0,
            price_monthly INTEGER NOT NULL,
            max_websites INTEGER DEFAULT 1,
            features TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // User servers table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            config_id INTEGER NOT NULL,
            server_name TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            ip_address TEXT,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (config_id) REFERENCES server_configs(id)
        )
    `);

    // Transactions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            amount INTEGER NOT NULL,
            description TEXT,
            reference_id TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_user_servers_user_id ON user_servers(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_servers_status ON user_servers(status);
        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);

    console.log('Database tables created successfully');
}

// Insert default server configurations
export function seedServerConfigs(): void {
    const configs = [
        {
            name: 'Kitten',
            cpu_cores: 1,
            ram_gb: 1,
            storage_gb: 2,
            storage_type: 'NVMe SSD Gen 3',
            bandwidth_gb: 50,
            price_monthly: 50000,
            max_websites: 1,
            features: JSON.stringify(['SSL miễn phí', 'Backup hàng tuần'])
        },
        {
            name: 'Cat',
            cpu_cores: 2,
            ram_gb: 2,
            storage_gb: 10,
            storage_type: 'NVMe SSD Gen 3',
            bandwidth_gb: 200,
            price_monthly: 100000,
            max_websites: 5,
            features: JSON.stringify(['SSL miễn phí', 'Backup tự động hàng ngày', 'Email hosting'])
        },
        {
            name: 'Lion',
            cpu_cores: 4,
            ram_gb: 4,
            storage_gb: 50,
            storage_type: 'NVMe SSD Gen 3',
            bandwidth_gb: 0, // Unlimited
            price_monthly: 200000,
            max_websites: 0, // Unlimited
            features: JSON.stringify(['SSL miễn phí', 'Backup tự động hàng ngày', 'Email hosting', 'Hỗ trợ ưu tiên', 'CDN miễn phí'])
        }
    ];

    const insert = db.prepare(`
        INSERT OR IGNORE INTO server_configs
        (name, cpu_cores, ram_gb, storage_gb, storage_type, bandwidth_gb, price_monthly, max_websites, features)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const config of configs) {
        insert.run(
            config.name,
            config.cpu_cores,
            config.ram_gb,
            config.storage_gb,
            config.storage_type,
            config.bandwidth_gb,
            config.price_monthly,
            config.max_websites,
            config.features
        );
    }

    console.log('Default server configurations seeded');
}

// Initialize database
export function initializeDatabase(): void {
    createTables();
    seedServerConfigs();
}
