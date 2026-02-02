import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import * as currentUserDecorator from 'src/common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from 'src/common/guards/auth.guard';
import { BookmarksService } from './bookmarks.service';

@Controller('bookmarks')
@UseGuards(FirebaseAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post(':jobId')
  async create(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.UserPayload,
    @Param('jobId') jobId: string,
  ) {
    return this.bookmarksService.addBookmark(user.uid, jobId);
  }

  @Delete(':jobId')
  async remove(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.UserPayload,
    @Param('jobId') jobId: string,
  ) {
    return this.bookmarksService.removeBookmark(user.uid, jobId);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.UserPayload,
  ) {
    console.log(req.headers);

    return this.bookmarksService.getUserBookmarks(user.uid);
  }
}
