import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "~/env";

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * General limiter: 100 requests per minute per identifier.
 * Identifier is the user ID for authenticated requests, or the client IP for anonymous ones.
 * null when Upstash env vars are not configured (development without Redis).
 */
export const generalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "60 s"),
      prefix: "rl:general",
    })
  : null;

/**
 * Strict limiter for the page-name generation mutation: 5 per hour per user.
 * null when Upstash env vars are not configured.
 */
export const nameGenLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "3600 s"),
      prefix: "rl:namegen",
    })
  : null;
