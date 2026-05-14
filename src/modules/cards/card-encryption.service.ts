import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CardEncryptionService {
  private readonly key: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';

  constructor(encryptionKey: string) {
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(encryptedData: string): string {
    const [ivB64, authTagB64, ciphertextB64] = encryptedData.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  }

  hashPan(pan: string): string {
    return crypto.createHash('sha256').update(pan).digest('hex');
  }
}
