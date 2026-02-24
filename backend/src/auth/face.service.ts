import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class FaceService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private jwtService: JwtService,
    ) { }

    /** Store the 128-float face embedding for a user (called after signup). */
    async enroll(userId: string, descriptor: number[]): Promise<{ enrolled: boolean }> {
        if (!descriptor || descriptor.length !== 128) {
            throw new BadRequestException('Invalid face descriptor: expected 128 floats');
        }
        const result = await this.userModel.updateOne(
            { _id: userId },
            { $set: { faceDescriptor: descriptor } },
        );
        if (result.matchedCount === 0) throw new NotFoundException('User not found');
        return { enrolled: true };
    }

    /** Compare the incoming descriptor with the stored one for an already-authenticated user. */
    async match(userId: string, descriptor: number[]): Promise<{ match: boolean; distance: number }> {
        if (!descriptor || descriptor.length !== 128) {
            throw new BadRequestException('Invalid face descriptor: expected 128 floats');
        }
        const user = await this.userModel.findById(userId).exec();
        if (!user) throw new NotFoundException('User not found');
        if (!user.faceDescriptor || user.faceDescriptor.length !== 128) {
            return { match: false, distance: -1 };
        }
        const distance = this.euclideanDistance(descriptor, user.faceDescriptor);
        return { match: distance < 0.5, distance: +distance.toFixed(4) };
    }

    /**
     * PUBLIC face login — no password.
     * Finds user by email, compares descriptor, issues JWT if it matches.
     */
    async faceLogin(
        email: string,
        descriptor: number[],
    ): Promise<{ access_token: string; user: object }> {
        if (!descriptor || descriptor.length !== 128) {
            throw new BadRequestException('Invalid face descriptor: expected 128 floats');
        }

        const user = await this.userModel
            .findOne({ email: email.toLowerCase() })
            .exec();

        if (!user) throw new UnauthorizedException('No account found for this email');

        if (!user.faceDescriptor || user.faceDescriptor.length !== 128) {
            throw new UnauthorizedException('No face enrolled for this account — use password login');
        }

        const distance = this.euclideanDistance(descriptor, user.faceDescriptor);
        if (distance >= 0.5) {
            throw new UnauthorizedException(
                `Face did not match (distance: ${distance.toFixed(4)}) — try again or use password`,
            );
        }

        // Face matched — issue JWT
        const payload = {
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
            },
        };
    }

    /** Euclidean distance between two 128-D vectors. */
    private euclideanDistance(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            const diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
}
