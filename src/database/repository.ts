import pool from './connection';
import {
    User,
    ServerConfig,
    UserServer,
    Transaction,
    CreateUserInput,
    CreateServerConfigInput,
    CreateUserServerInput,
    CreateTransactionInput
} from './models';

// ========================================
// User Repository
// ========================================

export const userRepository = {
    // Find user by ID
    async findById(id: string): Promise<User | undefined> {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] as User | undefined;
    },

    // Find user by username
    async findByUsername(username: string): Promise<User | undefined> {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0] as User | undefined;
    },

    // Create or update user (upsert)
    async upsert(input: CreateUserInput): Promise<User> {
        const existing = await this.findById(input.id);

        if (existing) {
            // Update existing user
            await pool.query(`
                UPDATE users
                SET username = $1, email = $2, avatar = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
            `, [input.username, input.email || null, input.avatar || null, input.id]);
        } else {
            // Create new user
            await pool.query(`
                INSERT INTO users (id, username, email, avatar, balance)
                VALUES ($1, $2, $3, $4, 0)
            `, [input.id, input.username, input.email || null, input.avatar || null]);
        }

        return (await this.findById(input.id))!;
    },

    // Update user balance
    async updateBalance(userId: string, amount: number): Promise<boolean> {
        const result = await pool.query(`
            UPDATE users
            SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [amount, userId]);

        return (result.rowCount || 0) > 0;
    },

    // Get user balance
    async getBalance(userId: string): Promise<number> {
        const user = await this.findById(userId);
        return user?.balance || 0;
    },

    // Get all users
    async findAll(): Promise<User[]> {
        const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
        return result.rows as User[];
    },

    // Delete user
    async delete(id: string): Promise<boolean> {
        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return (result.rowCount || 0) > 0;
    }
};

// ========================================
// Server Config Repository
// ========================================

export const serverConfigRepository = {
    // Find config by ID
    async findById(id: number): Promise<ServerConfig | undefined> {
        const result = await pool.query('SELECT * FROM server_configs WHERE id = $1', [id]);
        return result.rows[0] as ServerConfig | undefined;
    },

    // Find config by name
    async findByName(name: string): Promise<ServerConfig | undefined> {
        const result = await pool.query('SELECT * FROM server_configs WHERE name = $1', [name]);
        return result.rows[0] as ServerConfig | undefined;
    },

    // Get all active configs
    async findAllActive(): Promise<ServerConfig[]> {
        const result = await pool.query(
            'SELECT * FROM server_configs WHERE is_active = true ORDER BY price_monthly ASC'
        );
        return result.rows as ServerConfig[];
    },

    // Get all configs (including inactive)
    async findAll(): Promise<ServerConfig[]> {
        const result = await pool.query('SELECT * FROM server_configs ORDER BY price_monthly ASC');
        return result.rows as ServerConfig[];
    },

    // Create new config
    async create(input: CreateServerConfigInput): Promise<ServerConfig> {
        const result = await pool.query(`
            INSERT INTO server_configs
            (name, cpu_cores, ram_gb, storage_gb, storage_type, bandwidth_gb, price_monthly, max_websites, features)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [
            input.name,
            input.cpu_cores,
            input.ram_gb,
            input.storage_gb,
            input.storage_type,
            input.bandwidth_gb,
            input.price_monthly,
            input.max_websites,
            JSON.stringify(input.features)
        ]);

        return (await this.findById(result.rows[0].id))!;
    },

    // Update config
    async update(id: number, input: Partial<CreateServerConfigInput>): Promise<boolean> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }
        if (input.cpu_cores !== undefined) {
            fields.push(`cpu_cores = $${paramIndex++}`);
            values.push(input.cpu_cores);
        }
        if (input.ram_gb !== undefined) {
            fields.push(`ram_gb = $${paramIndex++}`);
            values.push(input.ram_gb);
        }
        if (input.storage_gb !== undefined) {
            fields.push(`storage_gb = $${paramIndex++}`);
            values.push(input.storage_gb);
        }
        if (input.storage_type !== undefined) {
            fields.push(`storage_type = $${paramIndex++}`);
            values.push(input.storage_type);
        }
        if (input.bandwidth_gb !== undefined) {
            fields.push(`bandwidth_gb = $${paramIndex++}`);
            values.push(input.bandwidth_gb);
        }
        if (input.price_monthly !== undefined) {
            fields.push(`price_monthly = $${paramIndex++}`);
            values.push(input.price_monthly);
        }
        if (input.max_websites !== undefined) {
            fields.push(`max_websites = $${paramIndex++}`);
            values.push(input.max_websites);
        }
        if (input.features !== undefined) {
            fields.push(`features = $${paramIndex++}`);
            values.push(JSON.stringify(input.features));
        }

        if (fields.length === 0) return false;

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(`
            UPDATE server_configs
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
        `, values);

        return (result.rowCount || 0) > 0;
    },

    // Toggle config active status
    async toggleActive(id: number): Promise<boolean> {
        const result = await pool.query(`
            UPDATE server_configs
            SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        return (result.rowCount || 0) > 0;
    },

    // Delete config
    async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM server_configs WHERE id = $1', [id]);
        return (result.rowCount || 0) > 0;
    }
};

// ========================================
// User Server Repository
// ========================================

export const userServerRepository = {
    // Find by ID
    async findById(id: number): Promise<UserServer | undefined> {
        const result = await pool.query('SELECT * FROM user_servers WHERE id = $1', [id]);
        return result.rows[0] as UserServer | undefined;
    },

    // Find all servers for a user
    async findByUserId(userId: string): Promise<UserServer[]> {
        const result = await pool.query(`
            SELECT us.*, sc.name as config_name, sc.cpu_cores, sc.ram_gb, sc.storage_gb
            FROM user_servers us
            JOIN server_configs sc ON us.config_id = sc.id
            WHERE us.user_id = $1
            ORDER BY us.created_at DESC
        `, [userId]);
        return result.rows as UserServer[];
    },

    // Create new user server
    async create(input: CreateUserServerInput): Promise<UserServer | null> {
        const config = await serverConfigRepository.findById(input.config_id);
        if (!config) return null;

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + input.months);

        const result = await pool.query(`
            INSERT INTO user_servers
            (user_id, config_id, server_name, status, expires_at)
            VALUES ($1, $2, $3, 'active', $4)
            RETURNING id
        `, [
            input.user_id,
            input.config_id,
            input.server_name,
            expiresAt
        ]);

        return await this.findById(result.rows[0].id) || null;
    },

    // Update server status
    async updateStatus(id: number, status: 'active' | 'suspended' | 'terminated'): Promise<boolean> {
        const result = await pool.query(`
            UPDATE user_servers
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [status, id]);

        return (result.rowCount || 0) > 0;
    },

    // Extend server expiration
    async extend(id: number, months: number): Promise<boolean> {
        const result = await pool.query(`
            UPDATE user_servers
            SET expires_at = expires_at + INTERVAL '1 month' * $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [months, id]);

        return (result.rowCount || 0) > 0;
    },

    // Get expired servers
    async findExpired(): Promise<UserServer[]> {
        const result = await pool.query(`
            SELECT * FROM user_servers
            WHERE expires_at < CURRENT_TIMESTAMP AND status = 'active'
        `);
        return result.rows as UserServer[];
    },

    // Delete server
    async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM user_servers WHERE id = $1', [id]);
        return (result.rowCount || 0) > 0;
    }
};

// ========================================
// Transaction Repository
// ========================================

export const transactionRepository = {
    // Find by ID
    async findById(id: number): Promise<Transaction | undefined> {
        const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
        return result.rows[0] as Transaction | undefined;
    },

    // Find all transactions for a user
    async findByUserId(userId: string, limit: number = 50): Promise<Transaction[]> {
        const result = await pool.query(`
            SELECT * FROM transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [userId, limit]);
        return result.rows as Transaction[];
    },

    // Create transaction
    async create(input: CreateTransactionInput): Promise<Transaction> {
        const result = await pool.query(`
            INSERT INTO transactions
            (user_id, type, amount, description, reference_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [
            input.user_id,
            input.type,
            input.amount,
            input.description,
            input.reference_id || null
        ]);

        return (await this.findById(result.rows[0].id))!;
    },

    // Get total deposits for a user
    async getTotalDeposits(userId: string): Promise<number> {
        const result = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM transactions
            WHERE user_id = $1 AND type = 'deposit'
        `, [userId]);

        return parseInt(result.rows[0].total);
    },

    // Get total spending for a user
    async getTotalSpending(userId: string): Promise<number> {
        const result = await pool.query(`
            SELECT COALESCE(SUM(ABS(amount)), 0) as total
            FROM transactions
            WHERE user_id = $1 AND type = 'purchase'
        `, [userId]);

        return parseInt(result.rows[0].total);
    }
};
