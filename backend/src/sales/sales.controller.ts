import {
    Controller, Get, Post, Delete, Body, Param, Query,
    UseGuards, UseInterceptors, UploadedFile, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SalesService } from './sales.service';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
    constructor(private readonly svc: SalesService) { }

    // POST /sales/upload — CSV upload
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
        const csvContent = file.buffer.toString('utf-8');
        return this.svc.importCsv(req.user.companyId, csvContent);
    }

    // POST /sales — manual entry
    @Post()
    create(@Body() body: any, @Req() req: any) {
        return this.svc.create(req.user.companyId, body);
    }

    // GET /sales/list
    @Get('list')
    findAll(@Req() req: any) {
        return this.svc.findAll(req.user.companyId);
    }

    // GET /sales/kpis
    @Get('kpis')
    getKpis(@Req() req: any) {
        return this.svc.getKpis(req.user.companyId);
    }

    // GET /sales/revenue-over-time?interval=day|month
    @Get('revenue-over-time')
    revenueOverTime(@Req() req: any, @Query('interval') interval: string) {
        return this.svc.revenueOverTime(req.user.companyId, interval || 'day');
    }

    // GET /sales/revenue-by-product
    @Get('revenue-by-product')
    revenueByProduct(@Req() req: any) {
        return this.svc.revenueByProduct(req.user.companyId);
    }

    // GET /sales/revenue-by-customer
    @Get('revenue-by-customer')
    revenueByCustomer(@Req() req: any) {
        return this.svc.revenueByCustomer(req.user.companyId);
    }

    // DELETE /sales/:id
    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.svc.delete(req.user.companyId, id);
    }
}
