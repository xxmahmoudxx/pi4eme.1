import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ArrayMinSize,
  Min,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsMongoId()
  @IsNotEmpty()
  commandeId: string;

  // Many-to-Many → tableau de productIds
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  productIds: string[];

  @IsMongoId()
  @IsNotEmpty()
  companyId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  priceTotal: number;
}
