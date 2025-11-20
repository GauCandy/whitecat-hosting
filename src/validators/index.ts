import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../types';

// Validation helper
export const validate = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const { error, value } = schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true
            });

            if (error) {
                const errors = error.details.map((detail: any) => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));

                throw new HttpError(400, 'Validation error', errors);
            }

            req.body = value;
            next();
        } catch (err) {
            next(err);
        }
    };
};

// Simple validation schemas (without external library)
export const validators = {
    deposit: (body: any) => {
        const { amount } = body;

        if (!amount || typeof amount !== 'number') {
            throw new HttpError(400, 'Amount must be a number');
        }

        if (amount <= 0) {
            throw new HttpError(400, 'Amount must be greater than 0');
        }

        if (!Number.isInteger(amount)) {
            throw new HttpError(400, 'Amount must be an integer');
        }

        return { amount };
    },

    purchaseServer: (body: any) => {
        const { config_id, server_name, months = 1 } = body;

        if (!config_id || typeof config_id !== 'number') {
            throw new HttpError(400, 'config_id must be a number');
        }

        if (!server_name || typeof server_name !== 'string') {
            throw new HttpError(400, 'server_name must be a string');
        }

        if (server_name.length < 3 || server_name.length > 50) {
            throw new HttpError(400, 'server_name must be between 3 and 50 characters');
        }

        if (typeof months !== 'number' || months < 1 || months > 24) {
            throw new HttpError(400, 'months must be between 1 and 24');
        }

        return { config_id, server_name, months };
    },

    extendServer: (body: any) => {
        const { months = 1 } = body;

        if (typeof months !== 'number' || months < 1 || months > 24) {
            throw new HttpError(400, 'months must be between 1 and 24');
        }

        return { months };
    },

    contactForm: (body: any) => {
        const { name, email, phone, message } = body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            throw new HttpError(400, 'Name must be at least 2 characters');
        }

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            throw new HttpError(400, 'Valid email is required');
        }

        if (!message || typeof message !== 'string' || message.trim().length < 10) {
            throw new HttpError(400, 'Message must be at least 10 characters');
        }

        return {
            name: name.trim(),
            email: email.trim(),
            phone: phone?.trim(),
            message: message.trim()
        };
    }
};
