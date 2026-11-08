import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateInventoryItemDto } from './create-inventory-item.dto';

// Stock level is deliberately not editable here — it only moves through
// transactions (kirim / chiqim / sanash) so every change has a history row.
export class UpdateInventoryItemDto extends PartialType(
  OmitType(CreateInventoryItemDto, ['quantity', 'unitPrice'] as const),
) {}
