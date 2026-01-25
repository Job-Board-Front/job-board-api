import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { FiltersService } from 'src/filters/filters.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobsRepository, FiltersService],
  exports: [JobsRepository], // Exported so Bookmarks can verify job existence
})
export class JobsModule {}
