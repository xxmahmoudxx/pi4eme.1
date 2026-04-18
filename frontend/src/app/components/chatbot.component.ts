import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, ChatMessage } from '../services/chatbot.service';
import { AnimationService } from '../services/animation.service';
import { Observable } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="chatbot-widget" [class.closed]="!isOpen">
      <!-- Header -->
      <div class="chatbot-header">
        <div class="header-title">
          <span class="chatbot-icon">💼</span>
          <div>
            <h3>{{ 'CHATBOT.TITLE' | translate }}</h3>
            <p class="status-text">{{ 'CHATBOT.STATUS' | translate }}</p>
          </div>
        </div>
        <button class="close-btn" (click)="closeChat()" type="button" title="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M15.898 4.045l-5.653 5.653 5.653 5.653c.3.3.3.77 0 1.07-.3.3-.77.3-1.07 0l-5.653-5.653-5.653 5.653c-.3.3-.77.3-1.07 0-.3-.3-.3-.77 0-1.07l5.653-5.653-5.653-5.653c-.3-.3-.3-.77 0-1.07.3-.3.77-.3 1.07 0l5.653 5.653 5.653-5.653c.3-.3.77-.3 1.07 0 .3.3.3.77 0 1.07z" />
          </svg>
        </button>
      </div>

      <!-- Messages Container -->
      <div class="chatbot-messages" #messagesContainer>
        <ng-container *ngIf="messages$ | async as messages">
          <div *ngIf="messages.length === 0" class="welcome-message">
            <p>{{ 'CHATBOT.WELCOME_1' | translate }}</p>
            <p>{{ 'CHATBOT.WELCOME_2' | translate }}</p>
          </div>
          <div *ngFor="let message of messages" [ngClass]="message.role" class="message">
            <div class="message-bubble" [class.typing]="message.typing">
              {{ message.content }}
              <span *ngIf="message.typing" class="typing-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </span>
            </div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </ng-container>
      </div>

      <!-- Input Area -->
      <div class="chatbot-input-area">
        <form class="input-form" (ngSubmit)="sendMessage()" (keydown.enter)="$event.preventDefault(); sendMessage()">
          <textarea 
            [(ngModel)]="userMessage" 
            name="message"
            [placeholder]="'CHATBOT.PLACEHOLDER' | translate"
            class="message-input"
            [disabled]="(isLoading$ | async) === true">
          </textarea>
          <button 
            type="button"
            class="send-btn"
            (click)="sendMessage()"
            [disabled]="!userMessage.trim() || (isLoading$ | async) === true">
            <span *ngIf="!(isLoading$ | async)">➤</span>
            <span *ngIf="isLoading$ | async" class="loading-spinner"></span>
          </button>
        </form>
        <div class="info-text">{{ 'CHATBOT.PRESS_ENTER' | translate }}</div>
      </div>
    </div>

    <!-- Floating Button (when closed) -->
    <button *ngIf="!isOpen" 
            class="chatbot-fab" 
            (click)="toggleChat()"
            type="button">
      💬
    </button>
  `,
  styles: [`
    :host {
      --chatbot-width: 400px;
      --chatbot-height: 650px;
    }

    @media (max-width: 768px) {
      :host {
        --chatbot-width: calc(100vw - 20px);
        --chatbot-height: 70vh;
      }
    }

    .chatbot-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: var(--chatbot-width);
      height: var(--chatbot-height);
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      z-index: 9999;
      overflow: hidden;
      opacity: 1;
      transform: translateY(0) scale(1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chatbot-widget.closed {
      opacity: 0;
      transform: translateY(500px) scale(0.95);
      pointer-events: none;
      visibility: hidden;
    }

    .chatbot-header {
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: white;
      padding: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .chatbot-icon {
      font-size: 28px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }

    .header-title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.2;
    }

    .status-text {
      font-size: 12px;
      opacity: 0.9;
      margin: 2px 0 0 0;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.35);
      border-color: rgba(255, 255, 255, 0.5);
      transform: rotate(90deg) scale(1.1);
    }

    .close-btn:active {
      transform: rotate(90deg) scale(0.95);
    }

    .welcome-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
      gap: 12px;
    }

    .welcome-message p {
      margin: 0;
      line-height: 1.5;
    }

    .welcome-message p:first-child {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--bg-secondary);
    }

    .chatbot-messages::-webkit-scrollbar {
      width: 6px;
    }

    .chatbot-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .chatbot-messages::-webkit-scrollbar-thumb {
      background: rgba(84, 131, 179, 0.3);
      border-radius: 3px;
    }

    .chatbot-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(84, 131, 179, 0.5);
    }

    .message {
      display: flex;
      flex-direction: column;
      gap: 6px;
      opacity: 0;
      animation: messageIn 0.3s ease-out forwards;
    }

    .message.user {
      align-items: flex-end;
    }

    .message.assistant {
      align-items: flex-start;
    }

    @keyframes messageIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      word-wrap: break-word;
      line-height: 1.5;
      font-size: 14px;
    }

    .message.user .message-bubble {
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message.assistant .message-bubble {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-bottom-left-radius: 4px;
    }

    .message-bubble.typing {
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 20px;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .typing-indicator .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: rgba(84, 131, 179, 0.6);
      animation: typingAnimation 1.4s infinite;
    }

    .typing-indicator .dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator .dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingAnimation {
      0%, 60%, 100% {
        opacity: 0.4;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-8px);
      }
    }

    .message-time {
      font-size: 11px;
      color: var(--text-secondary);
      padding: 0 4px;
      line-height: 1;
    }

    .chatbot-input-area {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
      background: var(--bg-primary);
      border-top: 2px solid var(--border-color);
      flex-shrink: 0;
    }

    .input-form {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      width: 100%;
    }

    .message-input {
      flex: 1;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      padding: 12px 14px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 14px;
      resize: none;
      max-height: 100px;
      min-height: 40px;
      transition: all 0.3s ease;
      outline: none;
    }

    .message-input::placeholder {
      color: var(--text-secondary);
      opacity: 0.7;
    }

    .message-input:focus {
      border-color: #5483B3;
      box-shadow: 0 0 0 3px rgba(84, 131, 179, 0.15);
      background: var(--bg-primary);
    }

    .message-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .send-btn {
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 18px;
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s ease;
      min-width: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(84, 131, 179, 0.3);
    }

    .send-btn:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(84, 131, 179, 0.5);
    }

    .send-btn:active:not(:disabled) {
      transform: translateY(-1px);
    }

    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spinningLoader 0.8s linear infinite;
    }

    @keyframes spinningLoader {
      to { transform: rotate(360deg); }
    }

    .info-text {
      font-size: 12px;
      color: var(--text-secondary);
      text-align: center;
      opacity: 0.6;
      font-weight: 500;
    }

    .chatbot-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      border: none;
      color: white;
      font-size: 32px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(84, 131, 179, 0.45);
      transition: all 0.3s ease;
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fabPulse 2s ease-in-out infinite;
    }

    @keyframes fabPulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 4px 16px rgba(84, 131, 179, 0.45);
      }
      50% {
        transform: scale(1.08);
        box-shadow: 0 6px 24px rgba(84, 131, 179, 0.65);
      }
    }

    .chatbot-fab:hover {
      transform: scale(1.12);
      box-shadow: 0 8px 28px rgba(84, 131, 179, 0.75);
    }

    .chatbot-fab:active {
      transform: scale(0.95);
    }

    @media (max-width: 480px) {
      :host {
        --chatbot-width: 100vw;
        --chatbot-height: 100vh;
      }

      .chatbot-widget {
        bottom: 0;
        right: 0;
        border-radius: 0;
      }

      .chatbot-fab {
        bottom: 20px;
        right: 20px;
      }

      .send-btn {
        min-width: auto;
        padding: 10px 14px;
        font-size: 14px;
      }

      .message-input {
        padding: 10px 12px;
        font-size: 13px;
      }
    }
  `]
})
export class ChatbotComponent implements OnInit {
  isOpen = false;
  userMessage = '';
  messages$: Observable<ChatMessage[]>;
  isLoading$: Observable<boolean>;

  constructor(
    private chatbotService: ChatbotService,
    private animationService: AnimationService,
    private translate: TranslateService
  ) {
    this.messages$ = this.chatbotService.messages$;
    this.isLoading$ = this.chatbotService.isLoading$;
  }

  ngOnInit(): void {
    this.loadBusinessContext();
  }

  private loadBusinessContext(): void {
    this.chatbotService.updateContext({
      companyName: 'Tenexa',
      healthScore: 75
    });
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => {
        const container = document.querySelector('.chatbot-messages');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  async sendMessage(): Promise<void> {
    if (!this.userMessage.trim()) {
      return;
    }

    const message = this.userMessage;
    this.userMessage = '';

    const userId = this.getUserId();
    await this.chatbotService.sendMessage(message, userId);

    setTimeout(() => {
      const container = document.querySelector('.chatbot-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  private getUserId(): string {
    return sessionStorage.getItem('userId') || 'anonymous_' + Date.now();
  }

  formatTime(date: Date): string {
    // Localized time format
    return date.toLocaleTimeString(this.translate.currentLang === 'ar' ? 'ar-EG' : (this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US'), { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}
