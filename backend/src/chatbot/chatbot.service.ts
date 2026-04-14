import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { Purchase, PurchaseDocument } from '../purchases/schemas/purchase.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatbotService {
  private readonly geminiApiKey: string;
  private readonly geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
  }

  async getResponse(userMessage: string, systemPrompt: string, user: any): Promise<{ reply: string }> {
    try {
      // Validate API key
      if (!this.geminiApiKey || this.geminiApiKey === 'your_gemini_api_key_here') {
        return this.getFallbackResponse(userMessage, user);
      }

      // Combine system prompt with user message
      const fullPrompt = `${systemPrompt}\n\nUser Question: ${userMessage}`;

      const response = await firstValueFrom(
        this.httpService.post<any>(
          `${this.geminiUrl}?key=${this.geminiApiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: fullPrompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE',
              },
            ]
          },
          {
            timeout: 30000
          }
        )
      );

      const reply = 
        (response.data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Sorry, I could not generate a response at this time.';

      return { reply };
    } catch (error: any) {
      console.error('Gemini API Error:', error?.message || error);
      
      // Provide fallback response when API fails
      return this.getFallbackResponse(userMessage, user);
    }
  }

  private async getFallbackResponse(userMessage: string, user: any): Promise<{ reply: string }> {
    const message = userMessage.toLowerCase().trim();

    // ═══════════════════════════════════════════════════════════════════
    // CSV IMPORT & FILE UPLOAD QUESTIONS (CHECK FIRST - MORE SPECIFIC)
    // ═══════════════════════════════════════════════════════════════════
    if (this.matchKeywords(message, ['csv', 'import', 'upload', 'file', 'data file', 'excel', 'spreadsheet', 'upload csv', 'import data', 'how can i import', 'how do i import', 'import csv'])) {
      return {
        reply: `📤 **How to Import CSV Files in Tenexa:**\n\n**Steps:**\n1. Navigate to Sales or Purchases section\n2. Click "Upload CSV" button\n3. Select your CSV file\n4. Review the column mapping\n5. Click "Confirm" to import\n\n**Supported Formats:**\n✅ CSV files (.csv)\n✅ Excel files (.xlsx, .xls)\n✅ Tab-separated values\n\n**Required Columns:**\n📅 Date\n📦 Product/Item\n📊 Quantity\n💵 Price (Unit or Total)\n\n**Tips:**\n• Use headers in your file\n• Check date format (MM/DD/YYYY or YYYY-MM-DD)\n• Ensure no blank rows\n\nNeed help with column mapping? Just upload and we'll guide you! 📁`
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // ACCOUNT & SIGNUP QUESTIONS
    // ═══════════════════════════════════════════════════════════════════
    if (this.matchKeywords(message, ['account', 'signup', 'register', 'create account', 'do an account', 'join tenexa', 'new account'])) {
      return {
        reply: `To create an account in Tenexa:\n\n📋 **Steps:**\n1. Go to the signup page\n2. Enter your full name\n3. Enter your email address\n4. Create a strong password\n5. Select your role (Company Owner or Employee)\n6. Verify your email\n7. Start using Tenexa!\n\nOnce you sign up, you can:\n✅ Add sales and purchase data\n✅ View analytics and KPIs\n✅ Use the AI chatbot for insights\n✅ Generate business alerts\n\nNeed more help? The system admin can invite you directly.`
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // CUSTOMER QUERIES
    // ═══════════════════════════════════════════════════════════════════
    if (this.matchKeywords(message, ['how many customers', 'customer count', 'total customers', 'number of customers', 'customers do i have'])) {
      try {
        if (!user?.companyId) {
          return {
            reply: 'I need to authenticate you to retrieve customer data. Please log in to view customer information.'
          };
        }

        const companyId = new Types.ObjectId(user.companyId);
        const sales = await this.saleModel.find({ companyId }).exec();
        
        // Get unique customers
        const uniqueCustomers = new Set<string>();
        sales.forEach(sale => {
          if (sale.customer && sale.customer !== 'Unknown') {
            uniqueCustomers.add(sale.customer);
          }
        });

        const customerCount = uniqueCustomers.size;
        const totalSales = sales.length;

        return {
          reply: `📊 **Your Customer Overview:**\n\n👥 **Unique Customers:** ${customerCount}\n📦 **Total Sales Transactions:** ${totalSales}\n\n${
            customerCount === 0 
              ? '💡 Start by adding sales data to track your customers!' 
              : `Top customers include: ${Array.from(uniqueCustomers).slice(0, 5).join(', ')}`
          }`
        };
      } catch (error) {
        console.error('Error fetching customer count:', error);
        return {
          reply: 'Unable to retrieve customer information at this moment. Please try again later.'
        };
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SALES DATA QUERIES
    // ═══════════════════════════════════════════════════════════════════
    if (this.matchKeywords(message, ['sales', 'revenue', 'income', 'earnings', 'sales data', 'total sales', 'how much sales', 'sales total'])) {
      try {
        if (!user?.companyId) {
          return { reply: 'Please log in to view your sales data.' };
        }

        const companyId = new Types.ObjectId(user.companyId);
        const sales = await this.saleModel.find({ companyId }).exec();

        if (sales.length === 0) {
          return {
            reply: '📊 **Sales Data:**\n\nNo sales recorded yet. Upload your first CSV file or manually add sales transactions to get started! 🚀'
          };
        }

        const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const avgSale = totalRevenue / sales.length;
        const latestSale = sales[0];

        return {
          reply: `💰 **Sales Summary:**\n\n📈 **Total Revenue:** $${totalRevenue.toFixed(2)}\n📊 **Total Transactions:** ${sales.length}\n💵 **Average Sale Value:** $${avgSale.toFixed(2)}\n📅 **Latest Sale:** ${new Date(latestSale.date).toLocaleDateString()}\n\nWould you like more details? Ask about specific products, customers, or time periods! 📈`
        };
      } catch (error) {
        console.error('Error fetching sales data:', error);
        return { reply: 'Unable to retrieve sales data. Please try again.' };
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // GENERAL BUSINESS QUESTIONS
    // ═══════════════════════════════════════════════════════════════════
    if (message === 'hi' || message === 'hello' || message === 'hey') {
      return {
        reply: 'Hello! 👋 I\'m your Business Intelligence Assistant. I can help you with:\n✅ Sales and revenue analysis\n✅ Customer information\n✅ Purchase insights\n✅ Business metrics\n✅ CSV imports\n\nWhat would you like to know?'
      };
    }

    if (this.matchKeywords(message, ['purchase', 'buy', 'purchases'])) {
      return {
        reply: 'I can help you with purchase analysis! Ask me about:\n📦 Purchase trends\n💼 Supplier information\n💳 Cost analysis\n📊 Purchase history\n\nWhat specific information do you need?'
      };
    }

    if (this.matchKeywords(message, ['inventory', 'stock', 'stockout', 'reorder', 'low stock', 'stock level', 'inventory level', 'reorder point'])) {
      try {
        if (!user?.companyId) {
          return { reply: 'Please log in to view inventory data.' };
        }

        // Extract product name if mentioned
        const productMatch = this.extractProductName(message);
        
        if (productMatch) {
          return await this.analyzeProductInventory(user.companyId, productMatch);
        } else {
          return await this.generateInventoryAlert(user.companyId);
        }
      } catch (error) {
        console.error('Error analyzing inventory:', error);
        return { reply: 'Unable to retrieve inventory data. Please try again.' };
      }
    }

    if (this.matchKeywords(message, ['health', 'performance', 'score', 'company health'])) {
      return {
        reply: '📊 **Company Health Score:**\n\nI track key metrics:\n✅ Revenue growth\n✅ Profitability\n✅ Operational efficiency\n✅ Customer satisfaction\n\nAsk me for your current health score!'
      };
    }

    if (this.matchKeywords(message, ['forecast', 'prediction', 'predict', 'trend'])) {
      return {
        reply: '🔮 **Business Forecasting:**\n\nI can generate:\n📈 Revenue forecasts\n📊 Sales projections\n🎯 Demand predictions\n📉 Trend analysis\n\nAsk me to forecast your next month or quarter!'
      };
    }

    if (this.matchKeywords(message, ['product', 'performance'])) {
      return {
        reply: '🏆 **Product Performance:**\n\nI analyze:\n⭐ Top performing products\n📊 Product profitability\n📈 Sales by category\n🎯 Product recommendations\n\nWhich product interests you?'
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRODUCT PROFITABILITY QUESTIONS
    // ═══════════════════════════════════════════════════════════════════
    if (this.matchKeywords(message, ['profit', 'profitability', 'making profit', 'is profit', 'is profitable', 'losing money', 'loss'])) {
      try {
        if (!user?.companyId) {
          return { reply: 'Please log in to view product profitability data.' };
        }

        // Extract product name from the message
        const productMatch = this.extractProductName(message);
        
        if (productMatch) {
          // Search for specific product
          return await this.analyzeProductProfitability(user.companyId, productMatch);
        } else {
          // Show all products with profitability
          return await this.analyzeAllProductsProfitability(user.companyId);
        }
      } catch (error) {
        console.error('Error analyzing profitability:', error);
        return { reply: 'Unable to retrieve profitability data. Please try again.' };
      }
    }

    if (this.matchKeywords(message, ['help', '?', 'what can you', 'what do you', 'what features'])) {
      return {
        reply: '🤖 **I\'m Your Business Assistant!**\n\n📊 **Data Analysis:**\n• Sales & revenue\n• Customer insights\n• Purchase analysis\n• Inventory management\n\n📈 **Predictions:**\n• Sales forecasts\n• Stockout risks\n• Trend analysis\n\n👤 **Account & Files:**\n• How to sign up\n• How to import CSV\n\nJust ask any business question! 💬'
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEFAULT HELPFUL RESPONSE
    // ═══════════════════════════════════════════════════════════════════
    return {
      reply: `I can help you with that! Here are some things I specialize in:\n\n📊 **Data & Analytics**\n• How many customers do I have?\n• What are my sales trends?\n• What's my company health score?\n\n💼 **Operations**\n• How can I import a CSV file?\n• Show me inventory levels\n• Forecast my revenue\n\n👤 **Account**\n• How can I create an account?\n\nTry asking me any of these questions! 🚀`
    };
  }

  private matchKeywords(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => message.includes(keyword.toLowerCase()));
  }

  private async generateInventoryAlert(companyId: string): Promise<{ reply: string }> {
    return {
      reply: '📦 **Inventory Status:**\n\nInventory tracking is managed through the Analytics dashboard using your sales and purchase data.\n\nGo to **Analytics → Stockout Risks** to view AI-powered inventory predictions based on your sales velocity and purchase history! 📊'
    };
  }

  private async analyzeProductInventory(companyId: string, productName: string): Promise<{ reply: string }> {
    return {
      reply: `📦 **Product Inventory: "${productName}"**\n\nFor detailed stock analysis, go to **Analytics → Stockout Risks** in your dashboard. Our ML model uses your sales and purchase history to predict stockout risks and recommend reorder quantities! 📊`
    };
  }

  private extractProductName(message: string): string | null {
    // Try to extract product name from phrases like:
    // "is [product] profitable?"
    // "is [product] making profit?"
    // "[product] profitability"
    
    const patterns = [
      /is\s+([^?]+)\s+(?:profitable|making profit|profit|a profit)/,
      /([^\s]+)\s+(?:profitable|profitability|profit)/,
      /profit.*?(?:for|on|from)\s+([^?]+)\?/
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  private async analyzeProductProfitability(companyId: string, productName: string): Promise<{ reply: string }> {
    try {
      const companyObjectId = new Types.ObjectId(companyId);

      // Get sales for this product
      const sales = await this.saleModel
        .find({ 
          companyId: companyObjectId,
          product: { $regex: productName, $options: 'i' }
        })
        .exec();

      // Get purchases for this product
      const purchases = await this.purchaseModel
        .find({ 
          companyId: companyObjectId,
          item: { $regex: productName, $options: 'i' }
        })
        .exec();

      if (sales.length === 0 && purchases.length === 0) {
        return {
          reply: `📊 **Product: "${productName}"**\n\nNo sales or purchase data found for this product. Upload your data files to track profitability! 📁`
        };
      }

      const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalCost = purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

      const statusEmoji = profit > 0 ? '✅' : profit === 0 ? '⚠️' : '❌';
      const profitStatus = profit > 0 ? 'PROFITABLE' : profit === 0 ? 'BREAK-EVEN' : 'LOSS';

      return {
        reply: `📊 **Product Profitability Analysis: "${productName}"**\n\n${statusEmoji} **Status:** ${profitStatus}\n\n💰 **Financial Summary:**\n📈 Total Revenue: $${totalRevenue.toFixed(2)}\n📉 Total Cost: $${totalCost.toFixed(2)}\n💵 Profit/Loss: $${profit.toFixed(2)}\n📊 Margin: ${profitMargin}%\n\n📦 **Volume:**\n🛒 Sales Transactions: ${sales.length}\n📦 Purchase Transactions: ${purchases.length}\n\n${
            profit > 0 
              ? `🎯 Great! This product is generating positive returns. Consider scaling up! 📈`
              : profit === 0
              ? `⚠️ This product is breaking even. Review pricing and costs for improvement.`
              : `⚠️ Warning: This product is currently operating at a loss. Recommend reviewing pricing strategy and costs.`
          }`
      };
    } catch (error) {
      console.error('Error analyzing product profitability:', error);
      return { reply: 'Unable to analyze this product\'s profitability. Please try again.' };
    }
  }

  private async analyzeAllProductsProfitability(companyId: string): Promise<{ reply: string }> {
    try {
      const companyObjectId = new Types.ObjectId(companyId);

      const sales = await this.saleModel.find({ companyId: companyObjectId }).exec();
      const purchases = await this.purchaseModel.find({ companyId: companyObjectId }).exec();

      if (sales.length === 0 || purchases.length === 0) {
        return {
          reply: '📊 **Product Profitability Report**\n\nNot enough data. Upload sales and purchase CSV files to generate profitability analysis! 📁'
        };
      }

      // Group by product
      const productMap = new Map<string, { revenue: number; cost: number }>();

      sales.forEach(sale => {
        const product = sale.product || 'Unknown';
        if (!productMap.has(product)) {
          productMap.set(product, { revenue: 0, cost: 0 });
        }
        productMap.get(product)!.revenue += sale.totalAmount || 0;
      });

      purchases.forEach(purchase => {
        const product = purchase.item || 'Unknown';
        if (!productMap.has(product)) {
          productMap.set(product, { revenue: 0, cost: 0 });
        }
        productMap.get(product)!.cost += purchase.totalCost || 0;
      });

      // Calculate profitability
      const products = Array.from(productMap.entries())
        .map(([name, data]) => ({
          name,
          profit: data.revenue - data.cost,
          revenue: data.revenue,
          cost: data.cost,
          margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100) : 0
        }))
        .sort((a, b) => b.profit - a.profit);

      if (products.length === 0) {
        return { reply: 'No product data available for analysis.' };
      }

      const profitable = products.filter(p => p.profit > 0);
      const unprofitable = products.filter(p => p.profit <= 0);

      let response = `📊 **Product Profitability Report**\n\n`;
      response += `📈 **Profitable Products (${profitable.length}):**\n`;

      profitable.slice(0, 5).forEach(p => {
        response += `✅ ${p.name}: $${p.profit.toFixed(2)} (${p.margin.toFixed(1)}% margin)\n`;
      });

      if (unprofitable.length > 0) {
        response += `\n📉 **Products at Risk (${unprofitable.length}):**\n`;
        unprofitable.slice(0, 5).forEach(p => {
          response += `❌ ${p.name}: $${p.profit.toFixed(2)} (${p.margin.toFixed(1)}% margin)\n`;
        });
      }

      response += `\n💡 **Recommendation:** Focus on scaling profitable products and review pricing for underperformers.`;

      return { reply: response };
    } catch (error) {
      console.error('Error analyzing all products profitability:', error);
      return { reply: 'Unable to generate profitability report. Please try again.' };
    }
  }
}
