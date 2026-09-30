import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ShoppingListItemInput } from './create-shopping-list.dto';

export class EditableShoppingListItemInput extends ShoppingListItemInput {
  // Omitted for items SUPER_ADMIN adds that the chef didn't ask for.
  @IsOptional()
  @IsString()
  id?: string;
}

/**
 * The full set of not-yet-purchased items after SUPER_ADMIN's edits —
 * existing items missing from it are removed. Purchased items are locked
 * and must not be sent.
 */
export class UpdateShoppingListItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EditableShoppingListItemInput)
  items!: EditableShoppingListItemInput[];
}
