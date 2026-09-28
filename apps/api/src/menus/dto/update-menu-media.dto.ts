import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuMediaDto } from './create-menu-media.dto';

export class UpdateMenuMediaDto extends PartialType(CreateMenuMediaDto) {}
