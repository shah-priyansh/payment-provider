export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: { url: process.env.DATABASE_URL },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  card: {
    encryptionKey: process.env.CARD_ENCRYPTION_KEY ?? '',
  },
});
