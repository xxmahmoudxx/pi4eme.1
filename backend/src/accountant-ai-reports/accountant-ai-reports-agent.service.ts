import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

interface AgentGenerateRequest {
  companyId: string;
  reportId?: string;
  includeWebResearch: boolean;
  focusAreas?: string[];
  customInstructions?: string;
  previousDraft?: string;
  context: Record<string, any>;
}

interface AgentCitation {
  title: string;
  url: string;
  source: string;
  snippet: string;
}

interface AgentReportSections {
  executiveSummary: string;
  businessState: string;
  risks: string[];
  opportunities: string[];
  inventoryActions: string[];
  purchasingActions: string[];
  pricingActions: string[];
  supplierActions: string[];
  actionPlan: string[];
  confidenceNote: string;
  shortEmailSummary: string;
  fullReportMarkdown: string;
  citations: AgentCitation[];
}

interface AgentGenerateResponse {
  report: Partial<AgentReportSections>;
  usedWebResearch?: boolean;
  citations?: AgentCitation[];
  generationWarnings?: string[];
}

export interface NormalizedAgentReport {
  sections: AgentReportSections;
  usedWebResearch: boolean;
  citations: AgentCitation[];
  generationWarnings: string[];
}

@Injectable()
export class AccountantAiReportsAgentService {
  private readonly logger = new Logger(AccountantAiReportsAgentService.name);
  private readonly baseUrl = process.env.AI_AGENT_SERVICE_URL || 'http://localhost:5001';
  private readonly timeoutMs = Number(process.env.AI_AGENT_TIMEOUT_MS || 120000);

  async generateReport(request: AgentGenerateRequest): Promise<NormalizedAgentReport> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const responseBody = await response.text();
      if (!response.ok) {
        this.logger.error(
          `AI agent error ${response.status}. Body: ${responseBody.slice(0, 1000)}`,
        );
        throw new ServiceUnavailableException('AI agent service returned an error');
      }

      const parsed = JSON.parse(responseBody) as AgentGenerateResponse;
      if (!parsed?.report) {
        throw new ServiceUnavailableException('AI agent service returned an invalid payload');
      }

      return this.normalizeAgentResponse(parsed);
    } catch (error: any) {
      this.logger.error(`AI agent call failed: ${error?.message || error}`);
      throw new ServiceUnavailableException(
        'AI report generation service is currently unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeAgentResponse(response: AgentGenerateResponse): NormalizedAgentReport {
    const report = response.report || {};
    const mergedCitations = this.uniqueCitations([
      ...(Array.isArray(response.citations) ? response.citations : []),
      ...(Array.isArray(report.citations) ? report.citations : []),
    ]);

    const sections: AgentReportSections = {
      executiveSummary: this.cleanText(report.executiveSummary),
      businessState: this.cleanText(report.businessState),
      risks: this.cleanStringArray(report.risks),
      opportunities: this.cleanStringArray(report.opportunities),
      inventoryActions: this.cleanStringArray(report.inventoryActions),
      purchasingActions: this.cleanStringArray(report.purchasingActions),
      pricingActions: this.cleanStringArray(report.pricingActions),
      supplierActions: this.cleanStringArray(report.supplierActions),
      actionPlan: this.cleanStringArray(report.actionPlan),
      confidenceNote: this.cleanText(report.confidenceNote),
      shortEmailSummary: this.cleanText(report.shortEmailSummary),
      fullReportMarkdown: this.cleanText(report.fullReportMarkdown),
      citations: mergedCitations,
    };

    if (!sections.fullReportMarkdown) {
      sections.fullReportMarkdown = this.buildFallbackMarkdown(sections);
    }

    if (!sections.shortEmailSummary) {
      sections.shortEmailSummary = sections.executiveSummary.slice(0, 400);
    }

    return {
      sections,
      usedWebResearch: Boolean(response.usedWebResearch),
      citations: mergedCitations,
      generationWarnings: this.cleanStringArray(response.generationWarnings),
    };
  }

  private cleanText(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private cleanStringArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }

  private uniqueCitations(citations: AgentCitation[]): AgentCitation[] {
    const seen = new Set<string>();
    const normalized: AgentCitation[] = [];

    for (const citation of citations) {
      const url = this.cleanText(citation?.url);
      const title = this.cleanText(citation?.title);
      const source = this.cleanText(citation?.source);
      const snippet = this.cleanText(citation?.snippet);
      if (!title && !url && !snippet) continue;
      const key = `${title}|${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push({ title, url, source, snippet });
    }

    return normalized;
  }

  private buildFallbackMarkdown(sections: AgentReportSections): string {
    const block = (title: string, body: string) =>
      body ? `## ${title}\n${body}\n` : '';
    const list = (title: string, values: string[]) =>
      values.length ? `## ${title}\n${values.map((item) => `- ${item}`).join('\n')}\n` : '';

    return [
      block('Executive Summary', sections.executiveSummary),
      block('Current Business State', sections.businessState),
      list('Major Risks', sections.risks),
      list('Major Opportunities', sections.opportunities),
      list('Inventory Recommendations', sections.inventoryActions),
      list('Purchasing Recommendations', sections.purchasingActions),
      list('Pricing Recommendations', sections.pricingActions),
      list('Supplier Recommendations', sections.supplierActions),
      list('Operational Next Steps', sections.actionPlan),
      block('Confidence And Uncertainty', sections.confidenceNote),
    ]
      .filter(Boolean)
      .join('\n')
      .trim();
  }
}
