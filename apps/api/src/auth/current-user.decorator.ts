import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthRequest } from "./types";

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthRequest>();
  return request.user;
});
