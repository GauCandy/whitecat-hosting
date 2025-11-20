import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';

// Database file path
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'whitecat.db');

// Create database connection
const db: DatabaseType = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

export default db;
