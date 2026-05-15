import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

// cost 12 is the sweet spot — 10 is too fast, 14 is noticeably slow on login
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.users.create(email, passwordHash);
    return this.issueTokens(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    // same error for missing user vs wrong password — don't leak whether email exists
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user.id, user.email);
  }

  async refresh(userId: string, tokenId: string) {
    await this.prisma.refreshToken.update({ where: { id: tokenId }, data: { revoked: true } });
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.issueTokens(user.id, user.email);
  }

  async logout(tokenId: string) {
    await this.prisma.refreshToken.update({ where: { id: tokenId }, data: { revoked: true } });
  }

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.secret') as string,
      expiresIn: this.config.get('jwt.accessExpiresIn') as StringValue,
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret') as string,
      expiresIn: this.config.get('jwt.refreshExpiresIn') as StringValue,
    });

    // store hash not the token itself — if the DB leaks, tokens are still useless
    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
