import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierDto } from './create-supplier.dto';
import { IsString, IsEmail, IsMongoId, IsOptional } from 'class-validator';
export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
