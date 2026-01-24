import { PartialType } from '@nestjs/mapped-types';
import { StoreDto } from './create-session.dto';

export class UpdateSessionDto extends PartialType(StoreDto) {}