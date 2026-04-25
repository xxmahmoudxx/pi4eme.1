import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccountantAiReportDto {
  @IsString()
  @MaxLength(200000)
  editedDraft: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  shortEmailSummary?: string;
}
