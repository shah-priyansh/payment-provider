import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { LuhnService } from './luhn.service';
import { CardTokenService } from './card-token.service';

@Module({
  providers: [CardsService, LuhnService, CardTokenService],
  controllers: [CardsController],
  exports: [CardTokenService],
})
export class CardsModule {}
