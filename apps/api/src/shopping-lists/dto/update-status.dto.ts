import { ShoppingListStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateShoppingListStatusDto {
  @IsEnum(ShoppingListStatus)
  status!: ShoppingListStatus;
}
