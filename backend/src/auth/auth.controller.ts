import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
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

  // ── Face Auth Endpoints ────────────────────────────────────────────────────

  @Post('face-login')
  async faceLogin(@Body() body: { email: string; descriptor: number[] }) {
    return this.faceService.faceLogin(body.email, body.descriptor);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('face-enroll')
  async faceEnroll(@Req() req: any, @Body() body: { descriptor: number[] }) {
    const userId = req.user.userId || req.user.sub;
    return this.faceService.enroll(userId, body.descriptor);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('face-match')
  async faceMatch(@Req() req: any, @Body() body: { descriptor: number[] }) {
    const userId = req.user.userId || req.user.sub;
    return this.faceService.match(userId, body.descriptor);
  }

  // ── 2FA Endpoints ─────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard('jwt'))
  @Get('2fa/status')
  async get2faStatus(@Req() req: any) {
    return this.authService.get2faStatus(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/generate')
  async generate2fa(@Req() req: any) {
    return this.authService.generate2fa(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/enable')
  async enable2fa(@Req() req: any, @Body() body: { code: string }) {
    await this.authService.enable2fa(req.user.userId, body.code);
    return { message: '2FA enabled successfully' };
  }

  @Post('2fa/verify')
  async verify2fa(@Body() body: { tempToken: string; code: string }) {
    return this.authService.verify2fa(body.tempToken, body.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/disable')
  async disable2fa(@Req() req: any, @Body() body: { code: string }) {
    await this.authService.disable2fa(req.user.userId, body.code);
    return { message: '2FA disabled successfully' };
  }

  // ── GitHub OAuth ────────────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req, @Res() res) {
    const result = await this.authService.loginGithubUser(req.user);
    const token = result.access_token;
    res.redirect(`http://localhost:4200/auth/callback?token=${token}`);
  }

  // ── Email Verification ──────────────────────────────────────────────────────

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: any) {
    await this.authService.verifyEmail(token);
    res.redirect('http://localhost:4200/login?verified=true');
  }
}