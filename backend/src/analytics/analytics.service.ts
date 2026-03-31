import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Purchase, PurchaseDocument } from '../purchases/schemas/purchase.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);
    private readonly mlBaseUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';

    constructor(
        @InjectModel(Purchase.name)
        private readonly purchaseModel: Model<PurchaseDocument>,
        @InjectModel(Sale.name)
        private readonly saleModel: Model<SaleDocument>,
    ) { }

    /** Fetch purchases + sales for a company, POST to Python ML, return result */
    private async callMl(companyId: string, endpoint: string): Promise<any> {
        const cid = new Types.ObjectId(companyId);

        const [purchases, sales] = await Promise.all([
            this.purchaseModel.find({ companyId: cid }).lean().exec(),
            this.saleModel.find({ companyId: cid }).lean().exec(),
        ]);

        const url = `${this.mlBaseUrl}${endpoint}`;
        this.logger.log(`Calling ML service: ${url} (${purchases.length} purchases, ${sales.length} sales)`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchases, sales }),
        });

        if (!response.ok) {
            const text = await response.text();
            this.logger.error(`ML service error: ${response.status} ${text}`);
            throw new Error(`ML service returned ${response.status}`);
        }

        return response.json();
    }

    async getStockoutRisks(companyId: string) {
        try {
            return await this.callMl(companyId, '/ml/stockout');
        } catch (e) {
            this.logger.error('Stockout prediction failed', e);
            return [];
        }
    }

    async getHealthScore(companyId: string) {
        try {
            return await this.callMl(companyId, '/ml/health-score');
        } catch (e) {
            this.logger.error('Health score failed', e);
            return { score: 0, status: 'Error', explanation: 'ML service unavailable', factors: [] };
        }
    }

    async getSalesForecast(companyId: string) {
        try {
            return await this.callMl(companyId, '/ml/forecast');
        } catch (e) {
            this.logger.error('Forecast failed', e);
            return { actual: [], forecast: [], trend: 'Error', nextWeekTotal: 0, confidence: 0 };
        }
    }

    async getProductPerformance(companyId: string) {
        try {
            return await this.callMl(companyId, '/ml/product-performance');
        } catch (e) {
            this.logger.error('Product performance failed', e);
            return [];
        }
    }
}
