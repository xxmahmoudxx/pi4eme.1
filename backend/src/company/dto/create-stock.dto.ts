import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateStockDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0)
  quantityAvailable: number;

  @IsMongoId()
  @IsNotEmpty()
  companyId: string;

  @IsOptional()
  lastUpdate?: Date;
}
