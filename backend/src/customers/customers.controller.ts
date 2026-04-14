import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
    constructor(private readonly svc: CustomersService) { }

    // GET /customers — list all
    @Get()
    findAll(@Req() req: any) {
        return this.svc.findAll(req.user.companyId);
    }

    // GET /customers/search?query= — autocomplete
    @Get('search')
    search(@Req() req: any, @Query('query') query: string) {
        return this.svc.search(req.user.companyId, query || '');
    }

    // POST /customers — create
    @Post()
    create(@Body() body: any, @Req() req: any) {
        return this.svc.create(req.user.companyId, body);
    }

    // PATCH /customers/:id — update
    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
        return this.svc.update(req.user.companyId, id, body);
    }

    // DELETE /customers/:id
    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.svc.delete(req.user.companyId, id);
    }
}
