import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, map } from 'rxjs';

export interface NotificationEvent {
  type: 'market_created' | 'market_approved' | 'market_deployed' | 'market_failed';
  data: any;
  timestamp?: Date;
  userId?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private notificationSubject = new Subject<NotificationEvent>();

  // Emit notification
  emit(event: NotificationEvent) {
    event.timestamp = new Date();
    this.logger.log(`📡 Notification: ${event.type}`);
    this.notificationSubject.next(event);
  }

  // Get SSE stream
  getStream(): Observable<{ data: string }> {
    return this.notificationSubject
      .asObservable()
      .pipe(map((event) => ({ data: JSON.stringify(event) })));
  }

  // Get user-specific stream
  getUserStream(userId: number): Observable<{ data: string }> {
    return this.notificationSubject.asObservable().pipe(
      map((event) => {
        // Include all global events + user-specific events
        if (!event.userId || event.userId === userId) {
          return { data: JSON.stringify(event) };
        }
        return null;
      }),
      map((data) => data || { data: JSON.stringify({ type: 'heartbeat', timestamp: new Date() }) }),
    );
  }

  // Specific notification methods
  notifyMarketCreated(market: any) {
    this.emit({
      type: 'market_created',
      data: {
        marketId: market.id,
        title: market.title,
        creator: market.creator.walletAddress,
      },
    });
  }

  notifyMarketApproved(market: any) {
    this.emit({
      type: 'market_approved',
      data: {
        marketId: market.id,
        title: market.title,
        approvedBy: market.approvedBy?.walletAddress,
      },
      userId: market.creatorId,
    });
  }

  notifyMarketDeployed(market: any, txHash: string) {
    this.emit({
      type: 'market_deployed',
      data: {
        marketId: market.id,
        title: market.title,
        txHash,
        status: 'LIVE',
      },
      userId: market.creatorId,
    });
  }

  notifyMarketFailed(market: any, error: string) {
    this.emit({
      type: 'market_failed',
      data: {
        marketId: market.id,
        title: market.title,
        error,
      },
      userId: market.creatorId,
    });
  }
}
