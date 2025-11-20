import { HttpError } from '../types';
import {
    userRepository,
    serverConfigRepository,
    userServerRepository,
    transactionRepository
} from '../database/repository';

class UserService {
    getUserBalance(userId: string): number {
        return userRepository.getBalance(userId);
    }

    async deposit(userId: string, amount: number): Promise<{ balance: number }> {
        // Update balance
        userRepository.updateBalance(userId, amount);

        // Create transaction record
        transactionRepository.create({
            user_id: userId,
            type: 'deposit',
            amount: amount,
            description: 'Nạp tiền vào tài khoản'
        });

        const newBalance = userRepository.getBalance(userId);
        return { balance: newBalance };
    }

    getTransactions(userId: string, limit: number = 50) {
        return transactionRepository.findByUserId(userId, limit);
    }

    getUserServers(userId: string) {
        return userServerRepository.findByUserId(userId);
    }

    async purchaseServer(userId: string, configId: number, serverName: string, months: number) {
        // Get config and check price
        const config = serverConfigRepository.findById(configId);
        if (!config) {
            throw new HttpError(404, 'Server configuration not found');
        }

        if (!config.is_active) {
            throw new HttpError(400, 'This server configuration is not available');
        }

        const totalPrice = config.price_monthly * months;
        const balance = userRepository.getBalance(userId);

        if (balance < totalPrice) {
            throw new HttpError(400, 'Insufficient balance', {
                required: totalPrice,
                current: balance,
                missing: totalPrice - balance
            });
        }

        // Deduct balance
        userRepository.updateBalance(userId, -totalPrice);

        // Create server
        const server = userServerRepository.create({
            user_id: userId,
            config_id: configId,
            server_name: serverName,
            months: months
        });

        if (!server) {
            // Refund if server creation failed
            userRepository.updateBalance(userId, totalPrice);
            throw new HttpError(500, 'Failed to create server');
        }

        // Create transaction record
        transactionRepository.create({
            user_id: userId,
            type: 'purchase',
            amount: -totalPrice,
            description: `Mua server ${config.name} - ${serverName} (${months} tháng)`,
            reference_id: server.id.toString()
        });

        return {
            server,
            new_balance: userRepository.getBalance(userId)
        };
    }

    async extendServer(userId: string, serverId: number, months: number) {
        // Get server
        const server = userServerRepository.findById(serverId);
        if (!server || server.user_id !== userId) {
            throw new HttpError(404, 'Server not found');
        }

        // Get config for price
        const config = serverConfigRepository.findById(server.config_id);
        if (!config) {
            throw new HttpError(404, 'Server configuration not found');
        }

        const totalPrice = config.price_monthly * months;
        const balance = userRepository.getBalance(userId);

        if (balance < totalPrice) {
            throw new HttpError(400, 'Insufficient balance', {
                required: totalPrice,
                current: balance,
                missing: totalPrice - balance
            });
        }

        // Deduct balance and extend
        userRepository.updateBalance(userId, -totalPrice);
        userServerRepository.extend(serverId, months);

        // Create transaction
        transactionRepository.create({
            user_id: userId,
            type: 'purchase',
            amount: -totalPrice,
            description: `Gia hạn server ${server.server_name} (${months} tháng)`,
            reference_id: serverId.toString()
        });

        return {
            new_balance: userRepository.getBalance(userId)
        };
    }
}

export const userService = new UserService();
