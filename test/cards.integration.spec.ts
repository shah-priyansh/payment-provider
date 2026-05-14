import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp, truncateTables } from './helpers/test-app';

async function registerAndLogin(app: INestApplication) {
  await request(app.getHttpServer()).post('/auth/register').send({ email: 'user@example.com', password: 'password123' });
  const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'user@example.com', password: 'password123' });
  return res.body.accessToken as string;
}

describe('Cards (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  afterEach(async () => truncateTables(prisma));
  afterAll(async () => app.close());

  it('POST /cards with valid card → 201 returns last4 only', async () => {
    const token = await registerAndLogin(app);
    const res = await request(app.getHttpServer())
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ cardNumber: '4532015112830366', expiry: '12/28', cvv: '123', cardholderName: 'John Doe' });
    expect(res.status).toBe(201);
    expect(res.body.lastFour).toBe('0366');
    expect(res.body.encryptedPan).toBeUndefined();
  });

  it('POST /cards with invalid Luhn → 400', async () => {
    const token = await registerAndLogin(app);
    const res = await request(app.getHttpServer())
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ cardNumber: '1234567890123456', expiry: '12/28', cvv: '123', cardholderName: 'John Doe' });
    expect(res.status).toBe(400);
  });

  it('POST /cards/:id/tokenize → returns token', async () => {
    const token = await registerAndLogin(app);
    const addRes = await request(app.getHttpServer())
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ cardNumber: '4532015112830366', expiry: '12/28', cvv: '123', cardholderName: 'John Doe' });
    const tokenRes = await request(app.getHttpServer())
      .post(`/cards/${addRes.body.id}/tokenize`)
      .set('Authorization', `Bearer ${token}`);
    expect(tokenRes.status).toBe(201);
    expect(tokenRes.body.token).toHaveLength(64);
  });
});
