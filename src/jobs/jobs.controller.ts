import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { FirebaseAuthGuard } from '../common/guards/auth.guard';
import { UpdateJobDto } from './dto/update-job.dto';
import { RolesGuard } from 'src/auth/roles/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/auth/roles/roles.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { UserPayload } from 'src/auth/interfaces/user-payload.interface';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() user: UserPayload,
  ) {
    const id = await this.jobsService.create(createJobDto, user);
    return { id, message: 'Job posted successfully' };
  }

  @Get()
  async findAll(@Query() query: JobQueryDto) {
    return this.jobsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    await this.jobsService.remove(id, user);
    return { message: 'Job deleted successfully' };
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @CurrentUser() user: UserPayload,
  ) {
    const updatedJob = await this.jobsService.update(id, updateJobDto, user);
    return { updatedJob, message: 'Job updated successfully' };
  }
}
