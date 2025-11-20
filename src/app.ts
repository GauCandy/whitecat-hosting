import express, { Application } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { initializeDatabase } from './database/schema';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
initializeDatabase();

// Create Express app
const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use(routes);

// Catch-all for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
