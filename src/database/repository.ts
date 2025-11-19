import db from './connection';
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
    findById(id: string): User | undefined {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    },

    // Find user by username
    findByUsername(username: string): User | undefined {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
    },

    // Create or update user (upsert)
    upsert(input: CreateUserInput): User {
        const existing = this.findById(input.id);

        if (existing) {
            // Update existing user
            db.prepare(`
                UPDATE users
                SET username = ?, email = ?, avatar = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(input.username, input.email || null, input.avatar || null, input.id);
        } else {
            // Create new user
            db.prepare(`
                INSERT INTO users (id, username, email, avatar, balance)
                VALUES (?, ?, ?, ?, 0)
            `).run(input.id, input.username, input.email || null, input.avatar || null);
        }

        return this.findById(input.id)!;
    },

    // Update user balance
    updateBalance(userId: string, amount: number): boolean {
        const result = db.prepare(`
            UPDATE users
            SET balance = balance + ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(amount, userId);

        return result.changes > 0;
    },

    // Get user balance
    getBalance(userId: string): number {
        const user = this.findById(userId);
        return user?.balance || 0;
    },

    // Get all users
    findAll(): User[] {
        return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[];
    },

    // Delete user
    delete(id: string): boolean {
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return result.changes > 0;
    }
};

// ========================================
// Server Config Repository
// ========================================

export const serverConfigRepository = {
    // Find config by ID
    findById(id: number): ServerConfig | undefined {
        return db.prepare('SELECT * FROM server_configs WHERE id = ?').get(id) as ServerConfig | undefined;
    },

    // Find config by name
    findByName(name: string): ServerConfig | undefined {
        return db.prepare('SELECT * FROM server_configs WHERE name = ?').get(name) as ServerConfig | undefined;
    },

    // Get all active configs
    findAllActive(): ServerConfig[] {
        return db.prepare('SELECT * FROM server_configs WHERE is_active = 1 ORDER BY price_monthly ASC').all() as ServerConfig[];
    },

    // Get all configs (including inactive)
    findAll(): ServerConfig[] {
        return db.prepare('SELECT * FROM server_configs ORDER BY price_monthly ASC').all() as ServerConfig[];
    },

    // Create new config
    create(input: CreateServerConfigInput): ServerConfig {
        const result = db.prepare(`
            INSERT INTO server_configs
            (name, cpu_cores, ram_gb, storage_gb, storage_type, bandwidth_gb, price_monthly, max_websites, features)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            input.name,
            input.cpu_cores,
            input.ram_gb,
            input.storage_gb,
            input.storage_type,
            input.bandwidth_gb,
            input.price_monthly,
            input.max_websites,
            JSON.stringify(input.features)
        );

        return this.findById(result.lastInsertRowid as number)!;
    },

    // Update config
    update(id: number, input: Partial<CreateServerConfigInput>): boolean {
        const fields: string[] = [];
        const values: any[] = [];

        if (input.name !== undefined) {
            fields.push('name = ?');
            values.push(input.name);
        }
        if (input.cpu_cores !== undefined) {
            fields.push('cpu_cores = ?');
            values.push(input.cpu_cores);
        }
        if (input.ram_gb !== undefined) {
            fields.push('ram_gb = ?');
            values.push(input.ram_gb);
        }
        if (input.storage_gb !== undefined) {
            fields.push('storage_gb = ?');
            values.push(input.storage_gb);
        }
        if (input.storage_type !== undefined) {
            fields.push('storage_type = ?');
            values.push(input.storage_type);
        }
        if (input.bandwidth_gb !== undefined) {
            fields.push('bandwidth_gb = ?');
            values.push(input.bandwidth_gb);
        }
        if (input.price_monthly !== undefined) {
            fields.push('price_monthly = ?');
            values.push(input.price_monthly);
        }
        if (input.max_websites !== undefined) {
            fields.push('max_websites = ?');
            values.push(input.max_websites);
        }
        if (input.features !== undefined) {
            fields.push('features = ?');
            values.push(JSON.stringify(input.features));
        }

        if (fields.length === 0) return false;

        fields.push("updated_at = datetime('now')");
        values.push(id);

        const result = db.prepare(`
            UPDATE server_configs
            SET ${fields.join(', ')}
            WHERE id = ?
        `).run(...values);

        return result.changes > 0;
    },

    // Toggle config active status
    toggleActive(id: number): boolean {
        const result = db.prepare(`
            UPDATE server_configs
            SET is_active = NOT is_active, updated_at = datetime('now')
            WHERE id = ?
        `).run(id);

        return result.changes > 0;
    },

    // Delete config
    delete(id: number): boolean {
        const result = db.prepare('DELETE FROM server_configs WHERE id = ?').run(id);
        return result.changes > 0;
    }
};

// ========================================
// User Server Repository
// ========================================

export const userServerRepository = {
    // Find by ID
    findById(id: number): UserServer | undefined {
        return db.prepare('SELECT * FROM user_servers WHERE id = ?').get(id) as UserServer | undefined;
    },

    // Find all servers for a user
    findByUserId(userId: string): UserServer[] {
        return db.prepare(`
            SELECT us.*, sc.name as config_name, sc.cpu_cores, sc.ram_gb, sc.storage_gb
            FROM user_servers us
            JOIN server_configs sc ON us.config_id = sc.id
            WHERE us.user_id = ?
            ORDER BY us.created_at DESC
        `).all(userId) as UserServer[];
    },

    // Create new user server
    create(input: CreateUserServerInput): UserServer | null {
        const config = serverConfigRepository.findById(input.config_id);
        if (!config) return null;

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + input.months);

        const result = db.prepare(`
            INSERT INTO user_servers
            (user_id, config_id, server_name, status, expires_at)
            VALUES (?, ?, ?, 'active', ?)
        `).run(
            input.user_id,
            input.config_id,
            input.server_name,
            expiresAt.toISOString()
        );

        return this.findById(result.lastInsertRowid as number) || null;
    },

    // Update server status
    updateStatus(id: number, status: 'active' | 'suspended' | 'terminated'): boolean {
        const result = db.prepare(`
            UPDATE user_servers
            SET status = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(status, id);

        return result.changes > 0;
    },

    // Extend server expiration
    extend(id: number, months: number): boolean {
        const result = db.prepare(`
            UPDATE user_servers
            SET expires_at = datetime(expires_at, '+' || ? || ' months'),
                updated_at = datetime('now')
            WHERE id = ?
        `).run(months, id);

        return result.changes > 0;
    },

    // Get expired servers
    findExpired(): UserServer[] {
        return db.prepare(`
            SELECT * FROM user_servers
            WHERE expires_at < datetime('now') AND status = 'active'
        `).all() as UserServer[];
    },

    // Delete server
    delete(id: number): boolean {
        const result = db.prepare('DELETE FROM user_servers WHERE id = ?').run(id);
        return result.changes > 0;
    }
};

// ========================================
// Transaction Repository
// ========================================

export const transactionRepository = {
    // Find by ID
    findById(id: number): Transaction | undefined {
        return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
    },

    // Find all transactions for a user
    findByUserId(userId: string, limit: number = 50): Transaction[] {
        return db.prepare(`
            SELECT * FROM transactions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `).all(userId, limit) as Transaction[];
    },

    // Create transaction
    create(input: CreateTransactionInput): Transaction {
        const result = db.prepare(`
            INSERT INTO transactions
            (user_id, type, amount, description, reference_id)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            input.user_id,
            input.type,
            input.amount,
            input.description,
            input.reference_id || null
        );

        return this.findById(result.lastInsertRowid as number)!;
    },

    // Get total deposits for a user
    getTotalDeposits(userId: string): number {
        const result = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM transactions
            WHERE user_id = ? AND type = 'deposit'
        `).get(userId) as { total: number };

        return result.total;
    },

    // Get total spending for a user
    getTotalSpending(userId: string): number {
        const result = db.prepare(`
            SELECT COALESCE(SUM(ABS(amount)), 0) as total
            FROM transactions
            WHERE user_id = ? AND type = 'purchase'
        `).get(userId) as { total: number };

        return result.total;
    }
};
