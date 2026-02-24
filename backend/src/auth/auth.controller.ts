import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { FaceService } from './face.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private faceService: FaceService,
  ) { }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * POST /auth/face-login  ← PUBLIC, no JWT required
   * Takes { email, descriptor } → if face matches → returns access_token.
   */
  @Post('face-login')
  async faceLogin(@Body() body: { email: string; descriptor: number[] }) {
    return this.faceService.faceLogin(body.email, body.descriptor);
  }

  /**
   * POST /auth/face-enroll
   * Stores a 128-float face descriptor on the authenticated user.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('face-enroll')
  async faceEnroll(@Req() req: any, @Body() body: { descriptor: number[] }) {
    const userId = req.user.userId || req.user.sub;
    return this.faceService.enroll(userId, body.descriptor);
  }

  /**
   * POST /auth/face-match
   * Compares incoming descriptor with stored embedding.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('face-match')
  async faceMatch(@Req() req: any, @Body() body: { descriptor: number[] }) {
    const userId = req.user.userId || req.user.sub;
    return this.faceService.match(userId, body.descriptor);
  }

  // ── 2FA Endpoints ─────────────────────────────────────────────────────────────

  /** GET /auth/2fa/status — returns { enabled: boolean } */
  @UseGuards(AuthGuard('jwt'))
  @Get('2fa/status')
  async get2faStatus(@Req() req: any) {
    return this.authService.get2faStatus(req.user.userId);
  }

  /**
   * POST /auth/2fa/generate
   * Generates a new TOTP secret and returns QR code (base64 PNG) + raw secret.
   * Does NOT enable 2FA yet — user must confirm with /auth/2fa/enable.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/generate')
  async generate2fa(@Req() req: any) {
    return this.authService.generate2fa(req.user.userId);
  }

  /**
   * POST /auth/2fa/enable
   * Body: { code: string }
   * Activates 2FA after user verifies their first OTP from Google Authenticator.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/enable')
  async enable2fa(@Req() req: any, @Body() body: { code: string }) {
    await this.authService.enable2fa(req.user.userId, body.code);
    return { message: '2FA enabled successfully' };
  }

  /**
   * POST /auth/2fa/verify  ← PUBLIC
   * Body: { tempToken: string, code: string }
   * Used during login when 2FA is required. Returns full access_token on success.
   */
  @Post('2fa/verify')
  async verify2fa(@Body() body: { tempToken: string; code: string }) {
    return this.authService.verify2fa(body.tempToken, body.code);
  }

  /**
   * POST /auth/2fa/disable
   * Body: { code: string }
   * Disables 2FA after user confirms with current OTP.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/disable')
  async disable2fa(@Req() req: any, @Body() body: { code: string }) {
    await this.authService.disable2fa(req.user.userId, body.code);
    return { message: '2FA disabled successfully' };
  }
}
