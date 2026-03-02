import { BadRequestException, Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { SignupDto } from './dto/signup.dto';
import { UserRole } from './roles.enum';
import { CompanyConfig, CompanyConfigDocument } from '../company/schemas/company-config.schema';
import { Types } from 'mongoose';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string;
  twoFactorPending?: boolean;
}

@Injectable()
export class AuthService implements OnModuleInit {
  
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(CompanyConfig.name) private companyModel: Model<CompanyConfigDocument>,
    private jwtService: JwtService,
    private twoFactorAuthService: TwoFactorAuthService,
    private mailService: MailService,
  ) { }
 
  async onModuleInit() {
    const adminExists = await this.userModel.exists({ role: UserRole.Admin });
    if (!adminExists) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await this.userModel.create({
        email: 'admin@bi.platform',
        name: 'System Admin',
        passwordHash,
        role: UserRole.Admin,
        companyId: 'SYSTEM',
        status: 'active',
        isEmailVerified: true,
      });
    }
  }

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).exec();
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user.isEmailVerified && user.passwordHash !== 'GITHUB_AUTH') {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.twoFactorEnabled) {
      const tempPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        twoFactorPending: true,
      };
      const tempToken = await this.jwtService.signAsync(tempPayload, { expiresIn: '5m' });
      return { requiresTwoFactor: true, tempToken };
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        status: user.status,
      },
    };
  }

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.userModel.exists({ email });
    if (existing) {
      throw new BadRequestException('Email address is already registered');
    }
  
    let companyId: string;
    if (dto.role === UserRole.CompanyOwner) {
      if (!dto.companyName || dto.taxRate === undefined || dto.currency === undefined) {
        throw new BadRequestException('companyName, taxRate, and currency are required when role is CompanyOwner');
      }
      companyId = new Types.ObjectId().toHexString();
      await this.companyModel.create({
        companyId,
        companyName: dto.companyName,
        taxRate: dto.taxRate,
        currency: dto.currency,
        email: dto.notificationEmail || email,
      });
    } else {
      if (!dto.companyId) {
        throw new BadRequestException('companyId is required when role is Accountant');
      }
      const companyExists = await this.companyModel.exists({ companyId: dto.companyId });
      if (!companyExists) {
        throw new BadRequestException('Company with the given companyId was not found');
      }
      companyId = dto.companyId;
    }
  
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = await this.userModel.create({
      companyId,
      name: dto.name,
      email,
      passwordHash,
      role: dto.role,
      status: 'active',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
    });
  
    await this.mailService.sendVerificationEmail(email, verificationToken);
  
    return {
      message: 'Account created! Please check your email to verify your account.',
    };
  }

  async findOrCreateGithubUser(profile: any) {
    const email = profile.emails[0].value.toLowerCase();
    const name = profile.displayName || profile.username;
  
    let user = await this.userModel.findOne({ email });
    if (user) return user;
  
    const companyId = new Types.ObjectId().toHexString();
    await this.companyModel.create({
      companyId,
      companyName: `${name}'s Company`,
      taxRate: 0,
      currency: 'USD',
      email,
    });
  
    user = await this.userModel.create({
      email,
      name,
      passwordHash: 'GITHUB_AUTH',
      role: UserRole.CompanyOwner,
      companyId,
      status: 'active',
      isEmailVerified: true,
    });
  
    return user;
  }
  
  async loginGithubUser(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
  
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        status: user.status,
      },
    };
  }

  // ── Email Verification ──────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({ emailVerificationToken: token });
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await user.save();
  
    return { message: 'Email verified successfully' };
  }

  // ── 2FA Methods ──────────────────────────────────────────────────────────────

  async get2faStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException();
    return { enabled: user.twoFactorEnabled };
  }

  async generate2fa(userId: string): Promise<{ qrCode: string; secret: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException();

    const secret = this.twoFactorAuthService.generateSecret(user.email);
    const encrypted = this.twoFactorAuthService.encrypt(secret.base32);
    await this.userModel.updateOne({ _id: userId }, { twoFactorSecret: encrypted });

    const qrCode = await this.twoFactorAuthService.generateQrCode(secret.otpauth_url!);
    return { qrCode, secret: secret.base32 };
  }

  async enable2fa(userId: string, code: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('No 2FA secret generated. Call /auth/2fa/generate first.');
    }

    const decryptedSecret = this.twoFactorAuthService.decrypt(user.twoFactorSecret);
    const isValid = this.twoFactorAuthService.verifyOtp(decryptedSecret, code);
    if (!isValid) throw new UnauthorizedException('Invalid OTP code');

    await this.userModel.updateOne({ _id: userId }, { twoFactorEnabled: true });
  }

  async verify2fa(tempToken: string, code: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.twoFactorPending) {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.twoFactorSecret) throw new UnauthorizedException();

    const decryptedSecret = this.twoFactorAuthService.decrypt(user.twoFactorSecret);
    const isValid = this.twoFactorAuthService.verifyOtp(decryptedSecret, code);
    if (!isValid) throw new UnauthorizedException('Invalid OTP code');

    const fullPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
    return {
      access_token: await this.jwtService.signAsync(fullPayload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        status: user.status,
      },
    };
  }

  async disable2fa(userId: string, code: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const decryptedSecret = this.twoFactorAuthService.decrypt(user.twoFactorSecret!);
    const isValid = this.twoFactorAuthService.verifyOtp(decryptedSecret, code);
    if (!isValid) throw new UnauthorizedException('Invalid OTP code');

    await this.userModel.updateOne({ _id: userId }, { twoFactorEnabled: false, twoFactorSecret: null });
  }
}