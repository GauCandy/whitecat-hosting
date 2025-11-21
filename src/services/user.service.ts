import { HttpError } from '../types';
import {
    userRepository,
    serverConfigRepository,
    userServerRepository,
    transactionRepository
} from '../database/repository';

class UserService {
    async getUserBalance(userId: string): Promise<number> {
        return await userRepository.getBalance(userId);
    }

    async deposit(userId: string, amount: number): Promise<{ balance: number }> {
        // Update balance
        await userRepository.updateBalance(userId, amount);

        // Create transaction record
        await transactionRepository.create({
            user_id: userId,
            type: 'deposit',
            amount: amount,
            description: 'Nạp tiền vào tài khoản'
        });

        const newBalance = await userRepository.getBalance(userId);
        return { balance: newBalance };
    }

    async getTransactions(userId: string, limit: number = 50) {
        return await transactionRepository.findByUserId(userId, limit);
    }

    async getUserServers(userId: string) {
        return await userServerRepository.findByUserId(userId);
    }

    async purchaseServer(userId: string, configId: number, serverName: string, months: number) {
        // Get config and check price
        const config = await serverConfigRepository.findById(configId);
        if (!config) {
            throw new HttpError(404, 'Server configuration not found');
        }

        if (!config.is_active) {
            throw new HttpError(400, 'This server configuration is not available');
        }

        const totalPrice = config.price_monthly * months;
        const balance = await userRepository.getBalance(userId);

        if (balance < totalPrice) {
            throw new HttpError(400, 'Insufficient balance', {
                required: totalPrice,
                current: balance,
                missing: totalPrice - balance
            });
        }

        // Deduct balance
        await userRepository.updateBalance(userId, -totalPrice);

        // Create server
        const server = await userServerRepository.create({
            user_id: userId,
            config_id: configId,
            server_name: serverName,
            months: months
        });

        if (!server) {
            // Refund if server creation failed
            await userRepository.updateBalance(userId, totalPrice);
            throw new HttpError(500, 'Failed to create server');
        }

        // Create transaction record
        await transactionRepository.create({
            user_id: userId,
            type: 'purchase',
            amount: -totalPrice,
            description: `Mua server ${config.name} - ${serverName} (${months} tháng)`,
            reference_id: server.id.toString()
        });

        return {
            server,
            new_balance: await userRepository.getBalance(userId)
        };
    }

    async extendServer(userId: string, serverId: number, months: number) {
        // Get server
        const server = await userServerRepository.findById(serverId);
        if (!server || server.user_id !== userId) {
            throw new HttpError(404, 'Server not found');
        }

        // Get config for price
        const config = await serverConfigRepository.findById(server.config_id);
        if (!config) {
            throw new HttpError(404, 'Server configuration not found');
        }

        const totalPrice = config.price_monthly * months;
        const balance = await userRepository.getBalance(userId);

        if (balance < totalPrice) {
            throw new HttpError(400, 'Insufficient balance', {
                required: totalPrice,
                current: balance,
                missing: totalPrice - balance
            });
        }

        // Deduct balance and extend
        await userRepository.updateBalance(userId, -totalPrice);
        await userServerRepository.extend(serverId, months);

        // Create transaction
        await transactionRepository.create({
            user_id: userId,
            type: 'purchase',
            amount: -totalPrice,
            description: `Gia hạn server ${server.server_name} (${months} tháng)`,
            reference_id: serverId.toString()
        });

        return {
            new_balance: await userRepository.getBalance(userId)
        };
    }
}

export const userService = new UserService();
