import { execSync } from 'child_process';

export default async function globalSetup() {
  const url = process.env.DATABASE_TEST_URL ?? 'postgresql://payment:payment@localhost:5433/payment_test';
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
