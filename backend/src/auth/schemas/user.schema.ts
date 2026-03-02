import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../roles.enum';

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: UserRole })
  role: UserRole;

  @Prop({ required: true, default: 'active' })
  status: 'active' | 'inactive';

  @Prop({ type: [Number], default: null })
  faceDescriptor: number[] | null;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop({ default: null })
  twoFactorSecret: string | null;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, default: null })
  emailVerificationToken: string | null;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);