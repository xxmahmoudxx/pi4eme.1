import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

export class CreatePurchaseItemDto {
  @IsMongoId()
  @IsNotEmpty()
  achatId: string;

  @IsMongoId()
  @IsNotEmpty()
  supplierId: string;

  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsMongoId()
  @IsNotEmpty()
  companyId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  totalCost: number;
}
