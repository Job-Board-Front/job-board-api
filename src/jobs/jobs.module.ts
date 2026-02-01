import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { ScheduleModule } from '@nestjs/schedule';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { JobsSchedulerService } from './jobScheduler.service';

@Module({
  controllers: [JobsController],
  imports: [FirebaseModule],
  providers: [JobsService, JobsRepository,JobsSchedulerService],
  exports: [JobsRepository], // Exported so Bookmarks can verify job existence
})
export class JobsModule {}
