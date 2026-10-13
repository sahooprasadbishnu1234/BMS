import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpdateComplianceCaseDto } from './dto/update-case.dto';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async getCases() {
    return this.prisma.complianceCase.findMany({
      include: {
        customer: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        transaction: true,
        investigator: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCase(id: string, dto: UpdateComplianceCaseDto, user: AuthenticatedUser) {
    const caseRecord = await this.prisma.complianceCase.findUnique({ where: { id } });
    if (!caseRecord) {
      throw new NotFoundException(`Compliance case ${id} not found.`);
    }

    const updated = await this.prisma.complianceCase.update({
      where: { id },
      data: {
        status: dto.status,
        findings: dto.findings,
        actionsTaken: dto.actionsTaken,
        investigatorId: user.employeeId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: 'COMPLIANCE_CASE_UPDATED',
        targetEntity: 'ComplianceCase',
        targetEntityId: id,
        metadata: {
          newStatus: dto.status,
          investigatorId: user.employeeId,
        },
      },
    });

    return updated;
  }
}
