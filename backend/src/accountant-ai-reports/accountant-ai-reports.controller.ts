import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../auth/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccountantAiReportsService } from './accountant-ai-reports.service';
import { ApproveAndSendAccountantAiReportDto } from './dto/approve-and-send-accountant-ai-report.dto';
import { GenerateAccountantAiReportDto } from './dto/generate-accountant-ai-report.dto';
import { ReportHistoryQueryDto } from './dto/report-history-query.dto';
import { UpdateAccountantAiReportDto } from './dto/update-accountant-ai-report.dto';

interface CurrentUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
}

@Controller('accountant-ai-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountantAiReportsController {
  constructor(private readonly reportsService: AccountantAiReportsService) {}

  @Post('generate')
  @Roles(UserRole.Accountant)
  generateDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateAccountantAiReportDto,
  ) {
    return this.reportsService.generateDraft(user, dto);
  }

  @Post(':id/regenerate')
  @Roles(UserRole.Accountant)
  regenerateDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') reportId: string,
    @Body() dto: GenerateAccountantAiReportDto,
  ) {
    return this.reportsService.regenerateDraft(user, reportId, dto);
  }

  @Patch(':id/draft')
  @Roles(UserRole.Accountant)
  saveEditedDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') reportId: string,
    @Body() dto: UpdateAccountantAiReportDto,
  ) {
    return this.reportsService.saveEditedDraft(user, reportId, dto);
  }

  @Post(':id/approve-send')
  @Roles(UserRole.Accountant)
  approveAndSend(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') reportId: string,
    @Body() dto: ApproveAndSendAccountantAiReportDto,
  ) {
    return this.reportsService.approveAndSend(user, reportId, dto);
  }

  @Get()
  @Roles(UserRole.Accountant, UserRole.CompanyOwner)
  getHistory(@CurrentUser() user: CurrentUserPayload, @Query() query: ReportHistoryQueryDto) {
    return this.reportsService.getHistory(user, query.limit || 30);
  }

  @Get(':id')
  @Roles(UserRole.Accountant, UserRole.CompanyOwner)
  getById(@CurrentUser() user: CurrentUserPayload, @Param('id') reportId: string) {
    return this.reportsService.getById(user, reportId);
  }
}
