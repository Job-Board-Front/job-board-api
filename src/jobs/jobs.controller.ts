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
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { FirebaseAuthGuard } from '../common/guards/auth.guard';
import { UpdateJobDto } from './dto/update-job.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createJobDto: CreateJobDto) {
    const id = await this.jobsService.create(createJobDto);
    return { id, message: 'Job posted successfully' };
  }

  @Get()
  async findAll(@Query() query: JobQueryDto) {
    return this.jobsService.findAll(query);
  }

  @Get('bulk')
  async findMany(@Query('ids') ids: string) {
    const jobIds = ids.split(',').map((id) => id.trim());
    return this.jobsService.findManyByIds(jobIds);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async remove(@Param('id') id: string) {
    await this.jobsService.remove(id);
    return { message: 'Job deleted successfully' };
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard)
  async update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    const updatedJob = await this.jobsService.update(id, updateJobDto);
    return { updatedJob, message: 'Job updated successfully' };
  }
  @Post(':id/logo')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/job-logos',
        filename: (req, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueName + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(new Error('Only image files are allowed'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const logoUrl = `${file.filename}`;
    await this.jobsService.updateLogo(id, logoUrl);
    return {
      logoUrl,
      message: 'Job logo uploaded successfully',
    };
  }

  @UseGuards(FirebaseAuthGuard)
  @Get(':id/logo')
  async getLogo(@Param('id') id: string, @Req() req: Request) {
    const logoUrl = await this.jobsService.getLogoUrl(id);

    if (!logoUrl) {
      return { message: 'No logo uploaded for this job' };
    }
    return { logoUrl };
  }
}
