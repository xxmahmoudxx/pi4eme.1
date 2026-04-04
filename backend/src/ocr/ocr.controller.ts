import {
    Controller, Post, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OcrService } from './ocr.service';

@UseGuards(JwtAuthGuard)
@Controller('ocr')
export class OcrController {
    constructor(private readonly ocrService: OcrService) { }

    @Post('extract')
    @UseInterceptors(FileInterceptor('file'))
    async extract(@UploadedFile() file: Express.Multer.File) {
        return this.ocrService.extractFromImage(file.buffer, file.originalname);
    }
}
