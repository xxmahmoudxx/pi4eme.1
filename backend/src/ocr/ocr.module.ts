import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';

@Module({
    imports: [
        MulterModule.register({ storage: undefined }),
    ],
    controllers: [OcrController],
    providers: [OcrService],
    exports: [OcrService],
})
export class OcrModule { }
