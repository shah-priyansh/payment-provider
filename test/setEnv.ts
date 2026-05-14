process.env.DATABASE_URL =
  process.env.DATABASE_TEST_URL ?? 'postgresql://payment:payment@localhost:5433/payment_test';
