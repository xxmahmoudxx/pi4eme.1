import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { AuthService } from './auth.service';
import { FaceService } from './face.service';
import { User, UserSchema } from './schemas/user.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CompanyConfig, CompanyConfigSchema } from '../company/schemas/company-config.schema';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'dev_secret',
        signOptions: { expiresIn: '12h' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CompanyConfig.name, schema: CompanyConfigSchema },
    ]),
  ],
  controllers: [AuthController, UserController],
  providers: [AuthService, FaceService, JwtStrategy],
  exports: [AuthService, MongooseModule, JwtModule, PassportModule],
})
export class AuthModule { }
