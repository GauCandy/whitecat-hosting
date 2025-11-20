import { Response } from 'express';
import { AuthRequest } from '../types';
import { userService } from '../services/user.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validators } from '../validators';

export const userController = {
    // Get user balance
    getBalance: asyncHandler(async (req: AuthRequest, res: Response) => {
        const balance = userService.getUserBalance(req.userId!);
        res.json({ success: true, data: { balance } });
    }),

    // Deposit money
    deposit: asyncHandler(async (req: AuthRequest, res: Response) => {
        const validated = validators.deposit(req.body);
        const result = await userService.deposit(req.userId!, validated.amount);

        res.json({
            success: true,
            data: result
        });
    }),

    // Get transaction history
    getTransactions: asyncHandler(async (req: AuthRequest, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 50;
        const transactions = userService.getTransactions(req.userId!, limit);

        res.json({
            success: true,
            data: transactions
        });
    }),

    // Get user's servers
    getServers: asyncHandler(async (req: AuthRequest, res: Response) => {
        const servers = userService.getUserServers(req.userId!);

        res.json({
            success: true,
            data: servers
        });
    }),

    // Purchase a server
    purchaseServer: asyncHandler(async (req: AuthRequest, res: Response) => {
        const validated = validators.purchaseServer(req.body);

        const result = await userService.purchaseServer(
            req.userId!,
            validated.config_id,
            validated.server_name,
            validated.months
        );

        res.json({
            success: true,
            data: result
        });
    }),

    // Extend server
    extendServer: asyncHandler(async (req: AuthRequest, res: Response) => {
        const serverId = parseInt(req.params.id);
        const validated = validators.extendServer(req.body);

        const result = await userService.extendServer(
            req.userId!,
            serverId,
            validated.months
        );

        res.json({
            success: true,
            data: result
        });
    })
};
