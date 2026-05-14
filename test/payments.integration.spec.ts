import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MockBankService } from '../../src/modules/mock-bank/mock-bank.service';
import { createTestApp, truncateTables } from './helpers/test-app';
import { TransactionStatus } from '@prisma/client';
import { RetryService } from '../../src/modules/transactions/retry.service';

async function setupUserWithToken(app: INestApplication) {
  await request(app.getHttpServer()).post('/auth/register').send({ email: 'user@example.com', password: 'password123' });
  const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ email: 'user@example.com', password: 'password123' });
  const accessToken = loginRes.body.accessToken as string;

  const cardRes = await request(app.getHttpServer())
    .post('/cards')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ cardNumber: '4532015112830366', expiry: '12/28', cvv: '123', cardholderName: 'John Doe' });

  const tokenRes = await request(app.getHttpServer())
    .post(`/cards/${cardRes.body.id}/tokenize`)
    .set('Authorization', `Bearer ${accessToken}`);

  return { accessToken, cardToken: tokenRes.body.token as string };
}

describe('Payments (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bank: MockBankService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    bank = app.get(MockBankService);
  });
  afterEach(async () => truncateTables(prisma));
  afterAll(async () => app.close());

  it('POST /payments happy path → 201, transaction eventually CAPTURED', async () => {
    jest.spyOn(bank, 'authorize').mockResolvedValue({ success: true, authCode: 'AUTH_TEST' });
    const { accessToken, cardToken } = await setupUserWithToken(app);
    const res = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', crypto.randomUUID())
      .send({ cardToken, amount: 99.99, currency: 'USD' });
    expect(res.status).toBe(201);
    await new Promise((r) => setTimeout(r, 200));
    const tx = await prisma.transaction.findUnique({ where: { id: res.body.id } });
    expect(tx!.status).toBe(TransactionStatus.CAPTURED);
  });

  it('POST /payments with same idempotency key → returns same transaction', async () => {
    jest.spyOn(bank, 'authorize').mockResolvedValue({ success: true, authCode: 'AUTH_TEST' });
    const { accessToken, cardToken } = await setupUserWithToken(app);
    const key = crypto.randomUUID();
    const r1 = await request(app.getHttpServer()).post('/payments').set('Authorization', `Bearer ${accessToken}`).set('idempotency-key', key).send({ cardToken, amount: 99.99, currency: 'USD' });
    const r2 = await request(app.getHttpServer()).post('/payments').set('Authorization', `Bearer ${accessToken}`).set('idempotency-key', key).send({ cardToken, amount: 99.99, currency: 'USD' });
    expect(r1.body.id).toBe(r2.body.id);
  });

  it('POST /payments with non-retryable failure → FAILED terminal', async () => {
    jest.spyOn(bank, 'authorize').mockResolvedValue({ success: false, errorCode: 'INSUFFICIENT_FUNDS' });
    const { accessToken, cardToken } = await setupUserWithToken(app);
    const res = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', crypto.randomUUID())
      .send({ cardToken, amount: 99.99, currency: 'USD' });
    await new Promise((r) => setTimeout(r, 200));
    const tx = await prisma.transaction.findUnique({ where: { id: res.body.id } });
    expect(tx!.status).toBe(TransactionStatus.FAILED);
    expect(tx!.retryCount).toBe(0);
  });

  it('POST /payments with retryable failures exhausted → FAILED after 3 retries', async () => {
    jest.spyOn(bank, 'authorize').mockResolvedValue({ success: false, errorCode: 'NETWORK_TIMEOUT' });
    const retryService = app.get(RetryService);
    jest.spyOn(retryService, 'calculateDelay').mockReturnValue(10);
    const { accessToken, cardToken } = await setupUserWithToken(app);
    const res = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('idempotency-key', crypto.randomUUID())
      .send({ cardToken, amount: 99.99, currency: 'USD' });
    await new Promise((r) => setTimeout(r, 500));
    const tx = await prisma.transaction.findUnique({ where: { id: res.body.id } });
    expect(tx!.status).toBe(TransactionStatus.FAILED);
    expect(tx!.retryCount).toBe(3);
  });

  it('GET /payments/:id with wrong user → 403', async () => {
    jest.spyOn(bank, 'authorize').mockResolvedValue({ success: true, authCode: 'AUTH_TEST' });
    const { accessToken, cardToken } = await setupUserWithToken(app);
    const payRes = await request(app.getHttpServer()).post('/payments').set('Authorization', `Bearer ${accessToken}`).set('idempotency-key', crypto.randomUUID()).send({ cardToken, amount: 10, currency: 'USD' });

    await request(app.getHttpServer()).post('/auth/register').send({ email: 'other@example.com', password: 'password123' });
    const other = await request(app.getHttpServer()).post('/auth/login').send({ email: 'other@example.com', password: 'password123' });
    const getRes = await request(app.getHttpServer()).get(`/payments/${payRes.body.id}`).set('Authorization', `Bearer ${other.body.accessToken}`);
    expect(getRes.status).toBe(403);
  });
});
