import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

const statusCodeMap: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_SERVER_ERROR",
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    response.status(statusCode).json({
      code: statusCodeMap[statusCode] ?? "HTTP_ERROR",
      message: this.messageFromResponse(exceptionResponse, exception),
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private messageFromResponse(exceptionResponse: string | object | null, exception: unknown) {
    if (typeof exceptionResponse === "string") return exceptionResponse;
    if (exceptionResponse && "message" in exceptionResponse) {
      const message = (exceptionResponse as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join("; ") : message;
    }
    return exception instanceof Error ? exception.message : "Internal server error";
  }
}
