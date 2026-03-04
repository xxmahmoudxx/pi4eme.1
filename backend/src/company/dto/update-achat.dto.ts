import { PartialType } from '@nestjs/mapped-types';
import { CreateAchatDto } from './create-achat.dto';

export class UpdateAchatDto extends PartialType(CreateAchatDto) {}
