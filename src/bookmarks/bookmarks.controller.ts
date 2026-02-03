import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from 'src/common/guards/auth.guard';
import { BookmarksService } from './bookmarks.service';
import { RolesGuard } from 'src/auth/roles/guard/roles.guard';
import * as userPayloadInterface from 'src/auth/interfaces/user-payload.interface';
import { Role } from 'src/auth/roles/roles.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('bookmarks')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles(Role.USER)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post(':jobId')
  async create(
    @CurrentUser() user: userPayloadInterface.UserPayload,
    @Param('jobId') jobId: string,
  ) {
    return this.bookmarksService.addBookmark(user.uid, jobId);
  }

  @Delete(':jobId')
  async remove(
    @CurrentUser() user: userPayloadInterface.UserPayload,
    @Param('jobId') jobId: string,
  ) {
    return this.bookmarksService.removeBookmark(user.uid, jobId);
  }

  @Get()
  async findAll(@CurrentUser() user: userPayloadInterface.UserPayload) {
    return this.bookmarksService.getUserBookmarks(user.uid);
  }
}
