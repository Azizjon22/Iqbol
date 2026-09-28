import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuDishDto } from './create-menu-dish.dto';

export class UpdateMenuDishDto extends PartialType(CreateMenuDishDto) {}
