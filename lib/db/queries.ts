import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import {
  userSyncSchema,
  createThreadSchema,
  createTurnSchema,
  saveModelResponseSchema,
  castVoteSchema,
  type UserSyncInput,
  type CreateThreadInput,
  type CreateTurnInput,
  type SaveModelResponseInput,
  type CastVoteInput,
} from "./schema";

/**
 * Upsert a Clerk user into the local database
 */
export async function upsertUser(input: UserSyncInput) {
  const validated = userSyncSchema.parse(input);
  return prisma.user.upsert({
    where: { clerkId: validated.clerkId },
    update: {
      email: validated.email,
      name: validated.name,
      imageUrl: validated.imageUrl,
    },
    create: {
      clerkId: validated.clerkId,
      email: validated.email,
      name: validated.name,
      imageUrl: validated.imageUrl,
    },
  });
}

/**
 * Create a new thread
 */
export async function createThread(input: CreateThreadInput) {
  const validated = createThreadSchema.parse(input);
  return prisma.thread.create({
    data: {
      userId: validated.userId,
      title: validated.title,
    },
  });
}

/**
 * Get a thread by ID including all turns, model responses, and votes
 */
export async function getThreadById(threadId: string) {
  return prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      user: {
        select: {
          id: true,
          clerkId: true,
          name: true,
          imageUrl: true,
        },
      },
      turns: {
        orderBy: { createdAt: "asc" },
        include: {
          responses: {
            orderBy: { createdAt: "asc" },
          },
          vote: {
            include: {
              modelResponse: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get all threads for a specific user (sidebar history)
 */
export async function getUserThreads(userId: string) {
  return prisma.thread.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          turns: true,
        },
      },
    },
  });
}

/**
 * Create a conversational turn with model responses
 */
export async function createTurnWithResponses(
  turnInput: CreateTurnInput,
  responsesInput: readonly SaveModelResponseInput[]
) {
  const validatedTurn = createTurnSchema.parse(turnInput);
  const validatedResponses = responsesInput.map((r) => saveModelResponseSchema.parse(r));

  return prisma.turn.create({
    data: {
      threadId: validatedTurn.threadId,
      prompt: validatedTurn.prompt,
      responses: {
        create: validatedResponses.map((r) => ({
          modelId: r.modelId,
          modelName: r.modelName,
          text: r.text,
          status: r.status,
          timeToFirstTokenMs: r.timeToFirstTokenMs,
          tokensPerSecond: r.tokensPerSecond,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          totalTokens: r.totalTokens,
          costUsd: r.costUsd,
          errorMessage: r.errorMessage,
        })),
      },
    },
    include: {
      responses: true,
    },
  });
}

export type CastVoteResult =
  | {
      readonly ok: true;
      readonly vote: Awaited<ReturnType<typeof prisma.vote.create>>;
    }
  | {
      readonly ok: false;
      readonly refusal:
        "already-voted" | "turn-not-found" | "not-enough-responses" | "invalid-response";
    };

/**
 * Record a vote for a specific turn with race-condition safety.
 * Enforces rule: voting is only allowed when 2+ models answered,
 * and catches P2002 unique constraint violations on turnId gracefully.
 */
export async function castVote(input: CastVoteInput): Promise<CastVoteResult> {
  const validated = castVoteSchema.parse(input);

  // Verify turn has at least 2 completed responses
  const turn = await prisma.turn.findUnique({
    where: { id: validated.turnId },
    include: { responses: true, vote: true },
  });

  if (!turn) {
    return { ok: false, refusal: "turn-not-found" };
  }

  if (turn.vote) {
    return { ok: false, refusal: "already-voted" };
  }

  const completedResponses = turn.responses.filter(
    (r: { status: string }) => r.status === "COMPLETED"
  );
  if (completedResponses.length < 2) {
    return { ok: false, refusal: "not-enough-responses" };
  }

  // Ensure the voted response belongs to this turn
  const winningResponse = turn.responses.find(
    (r: { id: string }) => r.id === validated.modelResponseId
  );
  if (!winningResponse) {
    return { ok: false, refusal: "invalid-response" };
  }

  try {
    const vote = await prisma.vote.create({
      data: {
        turnId: validated.turnId,
        userId: validated.userId,
        modelResponseId: validated.modelResponseId,
      },
      include: {
        modelResponse: true,
      },
    });
    return { ok: true, vote };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Caught the race condition where another concurrent request wrote the vote first
      return { ok: false, refusal: "already-voted" };
    }
    throw error;
  }
}

export const recordVote = castVote;

export interface ModelLeaderboardStats {
  readonly modelId: string;
  readonly modelName: string;
  readonly wins: number;
  readonly totalBattles: number;
  readonly winRateFormatted: string; // e.g. "won 4 of 5"
  readonly avgSpeedTokensPerSec: number;
  readonly avgTimeToFirstTokenMs: number;
}

/**
 * Calculate leaderboard stats from votes and response metrics
 */
export async function getLeaderboard(
  userIdFilter?: string
): Promise<readonly ModelLeaderboardStats[]> {
  const votesWhere = userIdFilter ? { userId: userIdFilter } : {};

  const [votes, modelResponses] = await Promise.all([
    prisma.vote.findMany({
      where: votesWhere,
      select: {
        modelResponse: {
          select: {
            modelId: true,
            modelName: true,
          },
        },
      },
    }),
    prisma.modelResponse.findMany({
      where: {
        status: "COMPLETED",
        turn: userIdFilter ? { thread: { userId: userIdFilter } } : undefined,
      },
      select: {
        modelId: true,
        modelName: true,
        tokensPerSecond: true,
        timeToFirstTokenMs: true,
      },
    }),
  ]);

  // Map modelId -> modelName
  const modelNames: Record<string, string> = {};

  // Aggregate wins per model
  const winsByModel = votes.reduce<Record<string, number>>(
    (
      acc: Record<string, number>,
      vote: { modelResponse: { modelId: string; modelName: string } }
    ) => {
      const { modelId, modelName } = vote.modelResponse;
      modelNames[modelId] = modelName;
      acc[modelId] = (acc[modelId] ?? 0) + 1;
      return acc;
    },
    {}
  );

  // Group performance metrics per model
  const metricsByModel = modelResponses.reduce<
    Record<string, { speeds: number[]; ttfts: number[] }>
  >(
    (
      acc: Record<string, { speeds: number[]; ttfts: number[] }>,
      res: {
        modelId: string;
        modelName: string;
        tokensPerSecond: number | null;
        timeToFirstTokenMs: number | null;
      }
    ) => {
      modelNames[res.modelId] = res.modelName;
      if (!acc[res.modelId]) {
        acc[res.modelId] = { speeds: [], ttfts: [] };
      }
      if (typeof res.tokensPerSecond === "number") {
        acc[res.modelId].speeds.push(res.tokensPerSecond);
      }
      if (typeof res.timeToFirstTokenMs === "number") {
        acc[res.modelId].ttfts.push(res.timeToFirstTokenMs);
      }
      return acc;
    },
    {}
  );

  // Collect all unique model IDs
  const allModelIds = Array.from(
    new Set([...Object.keys(winsByModel), ...Object.keys(metricsByModel)])
  );

  return allModelIds
    .map((modelId) => {
      const wins = winsByModel[modelId] ?? 0;
      const modelMetrics = metricsByModel[modelId] ?? { speeds: [], ttfts: [] };
      const totalBattles = modelMetrics.speeds.length || wins || 1;

      const avgSpeed =
        modelMetrics.speeds.length > 0
          ? modelMetrics.speeds.reduce((sum: number, val: number) => sum + val, 0) /
            modelMetrics.speeds.length
          : 0;

      const avgTtft =
        modelMetrics.ttfts.length > 0
          ? modelMetrics.ttfts.reduce((sum: number, val: number) => sum + val, 0) /
            modelMetrics.ttfts.length
          : 0;

      return {
        modelId,
        modelName: modelNames[modelId] || modelId,
        wins,
        totalBattles,
        winRateFormatted: `won ${wins} of ${totalBattles}`,
        avgSpeedTokensPerSec: Math.round(avgSpeed * 10) / 10,
        avgTimeToFirstTokenMs: Math.round(avgTtft),
      };
    })
    .sort((a, b) => b.wins - a.wins || b.avgSpeedTokensPerSec - a.avgSpeedTokensPerSec);
}
