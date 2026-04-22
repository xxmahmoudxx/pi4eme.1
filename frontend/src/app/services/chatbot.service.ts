import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable, BehaviorSubject } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  typing?: boolean;
}

export interface ChatContext {
  healthScore?: number;
  salesOverview?: any;
  purchasesOverview?: any;
  topProducts?: any[];
  companyName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();

  private contextSubject = new BehaviorSubject<ChatContext>({});
  context$ = this.contextSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();

  private rateLimitMap = new Map<string, number[]>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_MESSAGES_PER_WINDOW = 10;

  private readonly BACKEND_URL = 'http://localhost:3000';

  constructor(private http: HttpClient, private authService: AuthService) {
    this.initializeWelcomeMessage();
    
    // Listen for logouts to clear chat history
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.clearMessages();
      }
    });
  }

  private initializeWelcomeMessage(): void {
    const messages = this.messagesSubject.value;
    if (messages.length === 0) {
      this.messagesSubject.next([
        {
          role: 'assistant',
          content: 'Hello! 👋 I\'m your Business Intelligence Assistant. I can help you analyze your sales, purchases, and business performance. What would you like to know?',
          timestamp: new Date()
        }
      ]);
    }
  }

  updateContext(context: ChatContext): void {
    this.contextSubject.next(context);
  }

  async sendMessage(userMessage: string, userId: string): Promise<void> {
    // Input validation
    if (!userMessage || userMessage.trim().length === 0) {
      console.warn('Empty message prevented');
      return;
    }

    // Rate limiting
    if (!this.checkRateLimit(userId)) {
      const lastMessages = this.messagesSubject.value;
      lastMessages.push({
        role: 'assistant',
        content: 'You\'re sending messages too quickly. Please wait a moment before sending another message.',
        timestamp: new Date()
      });
      this.messagesSubject.next(lastMessages);
      return;
    }

    // Add user message
    const messages = this.messagesSubject.value;
    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Add typing indicator
    const typingMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      typing: true
    };
    messages.push(typingMessage);
    this.messagesSubject.next(messages);
    this.isLoadingSubject.next(true);

    try {
      const response = await this.getChatResponse(userMessage).toPromise();
      
      if (response && response.reply) {
        // Remove typing indicator
        const updatedMessages = this.messagesSubject.value;
        updatedMessages.pop(); // Remove typing message

        // Add actual response
        updatedMessages.push({
          role: 'assistant',
          content: response.reply,
          timestamp: new Date()
        });
        this.messagesSubject.next(updatedMessages);
      }
    } catch (error) {
      console.error('Error getting chat response:', error);
      
      const errorMessages = this.messagesSubject.value;
      errorMessages.pop(); // Remove typing message
      errorMessages.push({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      });
      this.messagesSubject.next(errorMessages);
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  private getChatResponse(userMessage: string): Observable<any> {
    const context = this.contextSubject.value;
    const systemPrompt = this.buildSystemPrompt(context);

    return this.http.post(`${this.BACKEND_URL}/chat/respond`, {
      userMessage,
      systemPrompt,
      context
    });
  }

  private buildSystemPrompt(context: ChatContext): string {
    let prompt = `You are a professional Business Intelligence Assistant for a company called "${context.companyName || 'Tenexa'}".
You have access to real-time business data and should provide analytical insights.

Current Business Metrics:
- Company Health Score: ${context.healthScore || 'N/A'}/100`;

    if (context.salesOverview) {
      prompt += `\n- Sales Overview: ${JSON.stringify(context.salesOverview)}`;
    }

    if (context.purchasesOverview) {
      prompt += `\n- Purchases Overview: ${JSON.stringify(context.purchasesOverview)}`;
    }

    if (context.topProducts && context.topProducts.length > 0) {
      prompt += `\n- Top Products: ${context.topProducts.slice(0, 5).join(', ')}`;
    }

    prompt += `\n\nProvide concise, actionable insights. Use the data context to answer business-specific questions.
Focus on trends, patterns, and recommendations.`;

    return prompt;
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userTimestamps = this.rateLimitMap.get(userId) || [];

    // Remove old timestamps outside the window
    const recentTimestamps = userTimestamps.filter(ts => now - ts < this.RATE_LIMIT_WINDOW);

    if (recentTimestamps.length >= this.MAX_MESSAGES_PER_WINDOW) {
      return false;
    }

    recentTimestamps.push(now);
    this.rateLimitMap.set(userId, recentTimestamps);
    return true;
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
    this.initializeWelcomeMessage();
  }

  getMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }
}
