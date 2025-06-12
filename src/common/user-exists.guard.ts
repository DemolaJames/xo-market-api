import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract userId from JWT, param, or body
    const userId = request.user?.id || request.params.userId || request.body.userId;

    if (!userId) {
      throw new NotFoundException('User ID not provided');
    }

    const user = await this.prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return true;
  }
}