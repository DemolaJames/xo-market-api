import { Controller, Sse, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Request as ExpressRequest } from 'express';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Sse('stream')
  @ApiOperation({
    summary: 'Real-time notification stream (SSE)',
    description: 'Subscribe to Server-Sent Events for real-time market updates',
  })
  stream(): Observable<{ data: string }> {
    return this.notificationsService.getStream();
  }

  @Sse('my-stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User-specific notification stream (SSE)',
    description: 'Subscribe to personalized notifications',
  })
  myStream(@Request() req: ExpressRequest): Observable<{ data: string }> {
    return this.notificationsService.getUserStream((req.user as Express.User).id);
  }
}
