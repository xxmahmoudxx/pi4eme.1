import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ArrayMinSize,
  Min,
} from 'class-validator';

export enum AchatStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export class CreateAchatDto {
  @IsMongoId()
  @IsNotEmpty()
  companyId: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsEnum(AchatStatus)
  status?: AchatStatus;

  @IsNumber()
  @Min(0)
  totalCost: number;

  // Many-to-Many → tableau de productIds
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  productIds: string[];
}
