import { Request, Response } from 'express';
import { serverConfigRepository } from '../database/repository';
import { asyncHandler } from '../middleware/errorHandler';
import { HttpError } from '../types';

export const serverController = {
    // Get all active configs
    getAllConfigs: asyncHandler(async (req: Request, res: Response) => {
        const configs = await serverConfigRepository.findAllActive();

        res.json({
            success: true,
            data: configs.map(config => ({
                ...config,
                is_active: Boolean(config.is_active)
            }))
        });
    }),

    // Get single config
    getConfig: asyncHandler(async (req: Request, res: Response) => {
        const configId = parseInt(req.params.id);
        const config = await serverConfigRepository.findById(configId);

        if (!config) {
            throw new HttpError(404, 'Server configuration not found');
        }

        res.json({
            success: true,
            data: {
                ...config,
                is_active: Boolean(config.is_active)
            }
        });
    })
};
