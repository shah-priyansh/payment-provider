import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface BankResult {
  success: boolean;
  authCode?: string;
  errorCode?: string;
}

@Injectable()
export class MockBankService {
  async authorize(_pan: string, _amount: string, _currency: string): Promise<BankResult> {
    const roll = Math.random();
    await this.simulateDelay();
    if (roll < 0.85) return { success: true, authCode: `AUTH_${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}` };
    if (roll < 0.93) return { success: false, errorCode: 'INSUFFICIENT_FUNDS' };
    if (roll < 0.95) return { success: false, errorCode: 'INVALID_CARD' };
    if (roll < 0.97) return { success: false, errorCode: 'NETWORK_TIMEOUT' };
    if (roll < 0.99) return { success: false, errorCode: 'CARD_EXPIRED' };
    return { success: false, errorCode: 'RATE_LIMIT_EXCEEDED' };
  }

  private async simulateDelay(): Promise<void> {
    const delay = 100 + Math.random() * 2900;
    await new Promise((r) => setTimeout(r, delay));
  }
}
