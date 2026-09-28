import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentCliente = createParamDecorator((_d: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
