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

    /**
     * Fetch purchases + sales for a company,
     * FILTER out invalid rows before sending to ML,
     * POST to Python ML, return result.
     */
    private async callMl(companyId: string, endpoint: string): Promise<any> {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;

        const [rawPurchases, rawSales] = await Promise.all([
            this.purchaseModel.find({ companyId: cid }).lean().exec(),
            this.saleModel.find({ companyId: cid }).lean().exec(),
        ]);

        // ── ML Protection: filter out rows that would break ML ──
        const purchases = rawPurchases.filter(p =>
            p.item &&
            p.quantity != null && p.quantity >= 0 &&
            p.date &&
            p.totalCost != null && p.totalCost >= 0
        );

        const sales = rawSales.filter(s =>
            s.product &&
            s.quantity != null && s.quantity >= 0 &&
            s.date &&
            s.totalAmount != null && s.totalAmount >= 0
        );

        const filteredOutPurchases = rawPurchases.length - purchases.length;
        const filteredOutSales = rawSales.length - sales.length;
        if (filteredOutPurchases > 0 || filteredOutSales > 0) {
            this.logger.warn(
                `ML data filter: excluded ${filteredOutPurchases} purchases and ${filteredOutSales} sales with incomplete data`,
            );
        }

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

    async analyzePurchaseRequest(companyId: string, current: any) {
        try {
            const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
            // Get recent history (last 20) to check for patterns/duplicates
            const history = await this.purchaseModel
                .find({ companyId: cid })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean()
                .exec();

            const url = `${this.mlBaseUrl}/ml/analyze-purchase`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current, history }),
            });

            if (!response.ok) {
                this.logger.error(`ML analyze-purchase failed: ${response.status}`);
                return null;
            }
            return await response.json();
        } catch (e) {
            this.logger.error('Purchase analysis call failed', e);
            return null;
        }
    }
}
