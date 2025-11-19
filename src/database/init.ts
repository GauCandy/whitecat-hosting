import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
}

// Import and run initialization
import { initializeDatabase } from './schema';

console.log('Initializing WhiteCat database...');
initializeDatabase();
console.log('Database initialization complete!');
