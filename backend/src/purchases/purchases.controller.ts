import {
    Controller, Get, Post, Delete, Body, Param, Query,
    UseGuards, UseInterceptors, UploadedFile, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PurchasesService } from './purchases.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
    constructor(private readonly svc: PurchasesService) { }

    // POST /purchases/upload — CSV upload
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
        const csvContent = file.buffer.toString('utf-8');
        return this.svc.importCsv(req.user.companyId, csvContent);
    }

    // POST /purchases — manual entry
    @Post()
    create(@Body() body: any, @Req() req: any) {
        return this.svc.create(req.user.companyId, body);
    }

    // GET /purchases/list
    @Get('list')
    findAll(@Req() req: any) {
        return this.svc.findAll(req.user.companyId);
    }

    // GET /purchases/kpis
    @Get('kpis')
    getKpis(@Req() req: any) {
        return this.svc.getKpis(req.user.companyId);
    }

    // GET /purchases/over-time?interval=day|month
    @Get('over-time')
    overTime(@Req() req: any, @Query('interval') interval: string) {
        return this.svc.overTime(req.user.companyId, interval || 'day');
    }

    // GET /purchases/by-supplier
    @Get('by-supplier')
    bySupplier(@Req() req: any) {
        return this.svc.bySupplier(req.user.companyId);
    }

    // GET /purchases/by-category
    @Get('by-category')
    byCategory(@Req() req: any) {
        return this.svc.byCategory(req.user.companyId);
    }

    // DELETE /purchases/:id
    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.svc.delete(req.user.companyId, id);
    }
}
