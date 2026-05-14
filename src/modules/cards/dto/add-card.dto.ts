import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCardDto {
  @ApiProperty() @IsString() @Length(13, 19) cardNumber: string;
  @ApiProperty() @IsString() @Matches(/^\d{2}\/\d{2}$/, { message: 'expiry must be MM/YY' }) expiry: string;
  @ApiProperty() @IsString() @Length(3, 4) cvv: string;
  @ApiProperty() @IsString() @Length(2, 100) cardholderName: string;
}
