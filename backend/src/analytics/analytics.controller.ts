import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly svc: AnalyticsService) { }

    @Get('stockout-risks')
    getStockoutRisks(@Req() req: any) {
        return this.svc.getStockoutRisks(req.user.companyId);
    }

    @Get('health-score')
    getHealthScore(@Req() req: any) {
        return this.svc.getHealthScore(req.user.companyId);
    }

    @Get('sales-forecast')
    getSalesForecast(@Req() req: any) {
        return this.svc.getSalesForecast(req.user.companyId);
    }

    @Get('product-performance')
    getProductPerformance(@Req() req: any) {
        return this.svc.getProductPerformance(req.user.companyId);
    }
}
