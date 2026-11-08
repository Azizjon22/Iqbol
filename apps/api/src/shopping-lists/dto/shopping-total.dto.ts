import { Type } from 'class-transformer';
import { IsNumber, IsPositive, Max } from 'class-validator';

/** What the whole bazaar cost — one sum, not item by item. */
export class ShoppingTotalDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: "Summa 0 dan katta bo'lishi kerak" })
  @Max(99_999_999_999, { message: 'Summa juda katta' })
  total!: number;
}
