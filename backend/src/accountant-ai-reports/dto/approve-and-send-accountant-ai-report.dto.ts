import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveAndSendAccountantAiReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  finalApprovedText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  shortEmailSummary?: string;

  @IsOptional()
  @IsEmail()
  emailOverride?: string;
}
