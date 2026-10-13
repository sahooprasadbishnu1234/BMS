import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('System User & IAM Administration')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('SYSTEM_ADMINISTRATOR', 'AUDITOR')
  @ApiOperation({ summary: 'List all user accounts, role bindings, and lockout states' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('SYSTEM_ADMINISTRATOR', 'AUDITOR')
  @ApiOperation({ summary: 'Get user profile by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('SYSTEM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Update user status (lock/unlock) or reassign roles' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.usersService.updateUser(id, dto, admin);
  }
}
