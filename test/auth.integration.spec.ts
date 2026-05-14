import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp, truncateTables } from './helpers/test-app';

describe('Auth (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  afterEach(async () => truncateTables(prisma));
  afterAll(async () => app.close());

  it('POST /auth/register → 201 with tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('POST /auth/register with duplicate email → 409', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ email: 'test@example.com', password: 'password123' });
    const res = await request(app.getHttpServer()).post('/auth/register').send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('POST /auth/login with valid credentials → 201 with tokens', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ email: 'test@example.com', password: 'password123' });
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /auth/login with wrong password → 401', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ email: 'test@example.com', password: 'password123' });
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'test@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});
