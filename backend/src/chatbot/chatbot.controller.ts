import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatbotController {
  constructor(private chatbotService: ChatbotService) {}

  @Post('respond')
  async getChatResponse(
    @Body() dto: any,
    @Request() req: any
  ) {
    return this.chatbotService.getResponse(dto.userMessage, dto.systemPrompt, req.user);
  }
}
