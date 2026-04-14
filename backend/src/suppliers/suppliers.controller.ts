import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuppliersService } from './suppliers.service';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
    constructor(private readonly svc: SuppliersService) { }

    // GET /suppliers — list all
    @Get()
    findAll(@Req() req: any) {
        return this.svc.findAll(req.user.companyId);
    }

    // GET /suppliers/search?query= — autocomplete
    @Get('search')
    search(@Req() req: any, @Query('query') query: string) {
        return this.svc.search(req.user.companyId, query || '');
    }

    // POST /suppliers — create
    @Post()
    create(@Body() body: any, @Req() req: any) {
        return this.svc.create(req.user.companyId, body);
    }

    // PATCH /suppliers/:id — update
    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
        return this.svc.update(req.user.companyId, id, body);
    }

    // DELETE /suppliers/:id
    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.svc.delete(req.user.companyId, id);
    }
}
