import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validators } from '../validators';

export const contactController = {
    submit: asyncHandler(async (req: Request, res: Response) => {
        const validated = validators.contactForm(req.body);

        // Log contact submission (in production, send email or save to database)
        console.log('Contact form submission:', {
            ...validated,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Thank you for contacting WhiteCat Hosting! We will respond soon.'
        });
    })
};
