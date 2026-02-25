"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let MailService = class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST || 'smtp-relay.brevo.com',
            port: Number(process.env.MAIL_PORT) || 587,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    }
    async sendVerificationEmail(email, token) {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const verifyUrl = `${backendUrl}/auth/verify-email?token=${token}`;
        const info = await this.transporter.sendMail({
            from: `"BI Platform" <${process.env.MAIL_FROM || 'noreply@biplatform.com'}>`,
            to: email,
            subject: 'Verify your email',
            html: `
  <h2>Welcome to BI Platform!</h2>
  <p>Click the button below to verify your email:</p>
  <a href="${verifyUrl}" style="
    background-color: #4f46e5;
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: bold;
  ">Verify Email</a>
  <p>This link expires in 24 hours.</p>
`,
        });
        console.log('Email sent:', info.messageId);
    }
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)()
], MailService);
//# sourceMappingURL=mail.service.js.map