import "fastify";
import { User } from "@prisma/client";
import { preHandlerHookHandler } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
  }
  interface FastifyInstance {
    requireAdmin: preHandlerHookHandler;
    requireUser: preHandlerHookHandler;
  }
}
