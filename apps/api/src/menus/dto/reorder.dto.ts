import { ArrayMinSize, IsArray, IsString } from 'class-validator';

/** Ids in their new display order; each gets `order = index`. */
export class ReorderDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];
}
