import express, { Application, Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Application = express();

// Configuration
const PORT: number = parseInt(process.env.PORT || '3000', 10);
const IPV6_ADDRESS: string = process.env.IPV6_ADDRESS || '::';

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve compiled JavaScript
app.use('/js', express.static(path.join(__dirname, '..', 'public', 'js')));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'WhiteCat Hosting',
        timestamp: new Date().toISOString()
    });
});

// API endpoint for contact form
app.use(express.json());

interface ContactFormData {
    name: string;
    email: string;
    phone?: string;
    message: string;
}

app.post('/api/contact', (req: Request, res: Response) => {
    const { name, email, phone, message }: ContactFormData = req.body;

    // Validate required fields
    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

    // Log contact submission (in production, send email or save to database)
    console.log('Contact form submission:', {
        name,
        email,
        phone,
        message,
        timestamp: new Date().toISOString()
    });

    res.json({
        success: true,
        message: 'Thank you for contacting WhiteCat Hosting!'
    });
});

// Catch-all route - serve index.html for SPA-like behavior
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server with IPv6 support
const server = app.listen(PORT, IPV6_ADDRESS, () => {
    console.log(`
    🐱 WhiteCat Hosting Server
    ==========================
    Server running at:
    - IPv6: http://[${IPV6_ADDRESS}]:${PORT}
    - Local: http://localhost:${PORT}

    Environment: ${process.env.NODE_ENV || 'development'}
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Handle errors
server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else if (error.code === 'EACCES') {
        console.error(`Port ${PORT} requires elevated privileges`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

export default app;
