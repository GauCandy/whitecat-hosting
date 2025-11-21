import pool from './connection';

// Create all tables
export async function createTables(): Promise<void> {
    const client = await pool.connect();

    try {
        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                avatar TEXT,
                balance BIGINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Server configurations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS server_configs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                cpu_cores INTEGER NOT NULL,
                ram_gb REAL NOT NULL,
                storage_gb INTEGER NOT NULL,
                storage_type VARCHAR(255) DEFAULT 'NVMe SSD',
                bandwidth_gb INTEGER DEFAULT 0,
                price_monthly BIGINT NOT NULL,
                max_websites INTEGER DEFAULT 1,
                features JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // User servers table
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_servers (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                config_id INTEGER NOT NULL,
                server_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                ip_address VARCHAR(45),
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (config_id) REFERENCES server_configs(id)
            )
        `);

        // Transactions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                amount BIGINT NOT NULL,
                description TEXT,
                reference_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_user_servers_user_id ON user_servers(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_servers_status ON user_servers(status);
            CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
        `);

        console.log('Database tables created successfully');
    } finally {
        client.release();
    }
}

// Insert default server configurations
export async function seedServerConfigs(): Promise<void> {
    const client = await pool.connect();

    try {
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

        for (const config of configs) {
            await client.query(`
                INSERT INTO server_configs
                (name, cpu_cores, ram_gb, storage_gb, storage_type, bandwidth_gb, price_monthly, max_websites, features)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (name) DO NOTHING
            `, [
                config.name,
                config.cpu_cores,
                config.ram_gb,
                config.storage_gb,
                config.storage_type,
                config.bandwidth_gb,
                config.price_monthly,
                config.max_websites,
                config.features
            ]);
        }

        console.log('Default server configurations seeded');
    } finally {
        client.release();
    }
}

// Initialize database
export async function initializeDatabase(): Promise<void> {
    await createTables();
    await seedServerConfigs();
}
