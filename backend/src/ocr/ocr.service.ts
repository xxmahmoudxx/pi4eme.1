import { Injectable, Logger } from '@nestjs/common';
import * as FormData from 'form-data';
import axios from 'axios';

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);
    private readonly mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';

    async extractFromImage(imageBuffer: Buffer, filename: string): Promise<{ text: string; parsedRows: Record<string, string>[] }> {
        try {
            const formData = new FormData();
            formData.append('file', imageBuffer, { filename });

            const response = await axios.post(`${this.mlServiceUrl}/ocr/extract`, formData, {
                headers: formData.getHeaders(),
                timeout: 30000,
            });

            return response.data;
        } catch (error) {
            this.logger.error('OCR extraction failed', error);
            return { text: '', parsedRows: [] };
        }
    }
}
