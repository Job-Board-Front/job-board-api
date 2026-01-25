import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { FiltersModule } from './filters/filters.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    AuthModule,
    JobsModule,
    BookmarksModule,
    FiltersModule,
  ],
})
export class AppModule {}
