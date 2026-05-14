import { IsNumber, IsPositive, IsString, Length, Matches, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty() @IsString() cardToken: string;
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() @Max(999999.99) amount: number;
  @ApiProperty() @IsString() @Length(3, 3) @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code' }) currency: string;
}
