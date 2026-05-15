import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface BankResult {
  success: boolean;
  authCode?: string;
  errorCode?: string;
}

// simulates a real bank API — 85% approval rate, rest split across common decline reasons
@Injectable()
export class MockBankService {
  async authorize(_pan: string, _amount: string, _currency: string): Promise<BankResult> {
    const roll = Math.random();

    await this.simulateDelay();

    if (roll < 0.85) {
      const code = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
      return { success: true, authCode: `AUTH_${code}` };
    }

    if (roll < 0.93) return { success: false, errorCode: 'INSUFFICIENT_FUNDS' };
    if (roll < 0.95) return { success: false, errorCode: 'INVALID_CARD' };
    if (roll < 0.97) return { success: false, errorCode: 'NETWORK_TIMEOUT' };
    if (roll < 0.99) return { success: false, errorCode: 'CARD_EXPIRED' };

    return { success: false, errorCode: 'RATE_LIMIT_EXCEEDED' };
  }

  private async simulateDelay() {
    // real bank APIs take anywhere from 100ms to 3s
    const ms = 100 + Math.random() * 2900;
    await new Promise(r => setTimeout(r, ms));
  }
}
