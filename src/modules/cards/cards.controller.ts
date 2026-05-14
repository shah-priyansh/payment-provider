import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CardsService } from './cards.service';
import { CardTokenService } from './card-token.service';
import { AddCardDto } from './dto/add-card.dto';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(
    private readonly cards: CardsService,
    private readonly tokens: CardTokenService,
  ) {}

  @Post()
  addCard(@CurrentUser() user: { id: string }, @Body() dto: AddCardDto) {
    return this.cards.addCard(user.id, dto.cardNumber, dto.expiry, dto.cardholderName);
  }

  @Get()
  listCards(@CurrentUser() user: { id: string }) {
    return this.cards.listCards(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCard(@CurrentUser() user: { id: string }, @Param('id') cardId: string) {
    return this.cards.deleteCard(user.id, cardId);
  }

  @Post(':id/tokenize')
  tokenize(@CurrentUser() user: { id: string }, @Param('id') cardId: string) {
    return this.tokens.tokenize(cardId, user.id);
  }
}
