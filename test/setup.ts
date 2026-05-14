import { execSync } from 'child_process';

export default async function globalSetup() {
  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL ?? 'postgresql://payment:payment@localhost:5433/payment_test';
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }, stdio: 'inherit' });
}
