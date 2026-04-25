import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateAccountantAiReportDto {
  @IsOptional()
  @IsBoolean()
  includeWebResearch?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customInstructions?: string;
}
