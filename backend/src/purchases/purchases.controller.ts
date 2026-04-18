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

    // POST /purchases/upload/preview — Parse CSV, return headers + suggested mapping
    @Post('upload/preview')
    @UseInterceptors(FileInterceptor('file'))
    preview(@UploadedFile() file: Express.Multer.File) {
        const csvContent = file.buffer.toString('utf-8');
        return this.svc.previewCsv(csvContent);
    }

    // POST /purchases/upload/confirm — Import with user-confirmed mapping
    @Post('upload/confirm')
    @UseInterceptors(FileInterceptor('file'))
    async confirm(
        @UploadedFile() file: Express.Multer.File,
        @Body('mapping') mappingJson: string,
        @Body('isRequest') isRequest: string,
        @Req() req: any,
    ) {
        const csvContent = file.buffer.toString('utf-8');
        const mapping = JSON.parse(mappingJson);
        const requestFlag = isRequest === 'true' || isRequest === '1';
        console.log(`[CSV Import] Mapping:`, mapping);
        console.log(`[CSV Import] isRequest:`, isRequest, ' -> Flag:', requestFlag);
        return this.svc.importCsvWithMapping(req.user.companyId, csvContent, mapping, requestFlag, req.user.role);
    }

    // POST /purchases/upload — Legacy CSV upload (auto-mapping)
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

    // POST /purchases/upload-image — Upload invoice image, extract via OCR, return preview
    @Post('upload-image')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
        return this.svc.uploadInvoiceImage(file.buffer, file.originalname);
    }

    // POST /purchases/ocr/confirm — Save user-reviewed OCR rows through ETL pipeline
    @Post('ocr/confirm')
    async confirmOcr(@Body() body: { rows: any[], isRequest?: boolean }, @Req() req: any) {
        console.log(`[OCR Import] isRequest:`, body.isRequest);
        return this.svc.confirmOcrRows(req.user.companyId, body.rows, body.isRequest, req.user.role);
    }

    // DELETE /purchases/:id
    @Delete(':id')
    async remove(@Param('id') id: string, @Req() req: any) {
        return this.svc.delete(req.user.companyId, id);
    }

    // --- AI & Accountant Review Routes ---

    @Get('requests')
    findRequests(@Query() filters: any, @Req() req: any) {
        return this.svc.findRequests(req.user.companyId, filters);
    }

    @Get('review-stats')
    getReviewStats(@Req() req: any) {
        return this.svc.getReviewStats(req.user.companyId);
    }

    @Get('history')
    getHistory(@Query() filters: any, @Req() req: any) {
        return this.svc.getHistory(req.user.companyId, filters);
    }

    @Post(':id/review')
    reviewRequest(@Param('id') id: string, @Body() review: any, @Req() req: any) {
        return this.svc.reviewRequest(req.user.companyId, id, review);
    }
}
