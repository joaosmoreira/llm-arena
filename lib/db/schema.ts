import { z } from "zod";

export const responseStatusSchema = z.enum(["STREAMING", "COMPLETED", "FAILED"]);
export type ResponseStatusType = z.infer<typeof responseStatusSchema>;

export const userSyncSchema = z.object({
  clerkId: z.string().min(1, "Clerk ID is required"),
  email: z.string().email().optional(),
  name: z.string().optional(),
  imageUrl: z.string().url().optional(),
});
export type UserSyncInput = z.infer<typeof userSyncSchema>;

export const createThreadSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1).default("New Arena Battle"),
});
export type CreateThreadInput = z.infer<typeof createThreadSchema>;

export const createTurnSchema = z.object({
  threadId: z.string().min(1, "Thread ID is required"),
  prompt: z.string().min(1, "Prompt cannot be empty"),
});
export type CreateTurnInput = z.infer<typeof createTurnSchema>;

export const saveModelResponseSchema = z.object({
  turnId: z.string().min(1, "Turn ID is required"),
  modelId: z.string().min(1, "Model ID is required"),
  modelName: z.string().min(1, "Model Name is required"),
  text: z.string(),
  status: responseStatusSchema.default("COMPLETED"),
  timeToFirstTokenMs: z.number().int().nonnegative().optional(),
  tokensPerSecond: z.number().nonnegative().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  costUsd: z.number().nonnegative().optional().default(0.0),
  errorMessage: z.string().optional(),
});
export type SaveModelResponseInput = z.infer<typeof saveModelResponseSchema>;

export const castVoteSchema = z.object({
  turnId: z.string().min(1, "Turn ID is required"),
  userId: z.string().min(1, "User ID is required"),
  modelResponseId: z.string().min(1, "Model Response ID is required"),
});
export type CastVoteInput = z.infer<typeof castVoteSchema>;
