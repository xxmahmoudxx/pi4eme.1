import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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
   * This lets users log in with their face instead of their password.
   */
  @Post('face-login')
  async faceLogin(@Body() body: { email: string; descriptor: number[] }) {
    return this.faceService.faceLogin(body.email, body.descriptor);
  }

  /**
   * POST /auth/face-enroll
   * Stores a 128-float face descriptor on the authenticated user.
   * Body: { descriptor: number[] }
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
   * Returns { match: boolean, distance: number }
   * Body: { descriptor: number[] }
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('face-match')
  async faceMatch(@Req() req: any, @Body() body: { descriptor: number[] }) {
    const userId = req.user.userId || req.user.sub;
    return this.faceService.match(userId, body.descriptor);
  }
}
