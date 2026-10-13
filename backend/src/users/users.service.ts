import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        userRoles: { include: { role: true } },
        employee: { include: { branch: true } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
        employee: { include: { branch: true } },
        customer: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found.`);
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, admin: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found.`);
    }

    const data: any = {};
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'ACTIVE') {
        data.failedLoginAttempts = 0;
        data.lockedUntil = null;
      }
    }

    if (dto.roleName) {
      const role = await this.prisma.role.findUnique({ where: { name: dto.roleName } });
      if (!role) {
        throw new BadRequestException(`Role ${dto.roleName} does not exist.`);
      }

      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.create({
        data: { userId: id, roleId: role.id },
      });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { userRoles: { include: { role: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.userId,
        action: 'ADMIN_USER_UPDATED',
        targetEntity: 'User',
        targetEntityId: id,
        metadata: { updates: dto as any },
      },
    });

    return updated;
  }
}
