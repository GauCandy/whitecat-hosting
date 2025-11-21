import pool from './connection';
import { seedServerConfigs } from './schema';

async function resetServerConfigs() {
    const client = await pool.connect();

    try {
        console.log('Deleting existing server configurations...');
        await client.query('DELETE FROM server_configs');
        console.log('Server configurations deleted');

        console.log('Re-seeding server configurations...');
        await seedServerConfigs();
        console.log('Server configurations re-seeded successfully!');
    } catch (error) {
        console.error('Error resetting server configs:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

resetServerConfigs();
