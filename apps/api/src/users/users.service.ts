import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        telegram_id: true,
        username: true,
        display_name: true,
        language: true,
        role: true,
        status: true,
        legal_ack_version: true,
        risk_ack_version: true,
        created_at: true,
        last_login_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      telegram_id: user.telegram_id.toString(),
      created_at: user.created_at.toISOString(),
      last_login_at: user.last_login_at?.toISOString() || null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        language: dto.language,
        legal_ack_version: dto.legal_ack_version,
        risk_ack_version: dto.risk_ack_version,
      },
      select: {
        user_id: true,
        telegram_id: true,
        username: true,
        display_name: true,
        language: true,
        role: true,
        status: true,
        legal_ack_version: true,
        risk_ack_version: true,
        created_at: true,
        last_login_at: true,
      },
    });

    return {
      ...user,
      telegram_id: user.telegram_id.toString(),
      created_at: user.created_at.toISOString(),
      last_login_at: user.last_login_at?.toISOString() || null,
    };
  }
}
