import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../types';
import { isDevelopment } from '../config';

export const errorHandler = (
    err: Error | HttpError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof HttpError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            ...(isDevelopment && { details: err.details, stack: err.stack })
        });
    }

    // Default error
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(isDevelopment && { message: err.message, stack: err.stack })
    });
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
