// User model - stores user ID and balance
export interface User {
    id: string;              // Discord user ID
    username: string;        // Discord username
    email: string | null;    // Email (optional)
    avatar: string | null;   // Avatar URL
    balance: number;         // Account balance in VND
    created_at: string;      // ISO timestamp
    updated_at: string;      // ISO timestamp
}

// Server configuration model
export interface ServerConfig {
    id: number;              // Auto-increment ID
    name: string;            // Config name (e.g., "Kitten", "Cat", "Lion")
    cpu_cores: number;       // Number of CPU cores
    ram_gb: number;          // RAM in GB
    storage_gb: number;      // Storage in GB
    storage_type: string;    // Storage type (e.g., "NVMe SSD", "SSD", "HDD")
    bandwidth_gb: number;    // Bandwidth in GB (0 = unlimited)
    price_monthly: number;   // Monthly price in VND
    max_websites: number;    // Maximum websites (0 = unlimited)
    features: string[];      // Array of features (JSONB in database)
    is_active: boolean;      // Whether this config is available
    created_at: string;      // ISO timestamp
    updated_at: string;      // ISO timestamp
}

// User server instance - when a user purchases a server
export interface UserServer {
    id: number;              // Auto-increment ID
    user_id: string;         // Foreign key to users
    config_id: number;       // Foreign key to server_configs
    server_name: string;     // Custom server name
    status: 'active' | 'suspended' | 'terminated';
    ip_address: string | null;
    expires_at: string;      // When the server expires
    created_at: string;
    updated_at: string;
}

// Transaction history
export interface Transaction {
    id: number;
    user_id: string;
    type: 'deposit' | 'withdraw' | 'purchase' | 'refund';
    amount: number;          // Amount in VND (positive for deposit, negative for purchase)
    description: string;
    reference_id: string | null; // Reference to server or external transaction
    created_at: string;
}

// Input types for creating records
export interface CreateUserInput {
    id: string;
    username: string;
    email?: string;
    avatar?: string;
}

export interface CreateServerConfigInput {
    name: string;
    cpu_cores: number;
    ram_gb: number;
    storage_gb: number;
    storage_type: string;
    bandwidth_gb: number;
    price_monthly: number;
    max_websites: number;
    features: string[];
}

export interface CreateUserServerInput {
    user_id: string;
    config_id: number;
    server_name: string;
    months: number; // Number of months to purchase
}

export interface CreateTransactionInput {
    user_id: string;
    type: 'deposit' | 'withdraw' | 'purchase' | 'refund';
    amount: number;
    description: string;
    reference_id?: string;
}
