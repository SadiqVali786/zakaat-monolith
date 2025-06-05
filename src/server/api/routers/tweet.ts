import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const tweetRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ ctx, input: { text } }) => {
      const tweet = await ctx.db.tweet.create({
        data: { text, authorId: ctx.session.user.id },
      });
      return tweet;
    }),

  infiniteTweetsScrollFeed: protectedProcedure
    .input(
      z.object({
        onlyFollowing: z.boolean(),
        limit: z.number().optional(),
        cursor: z.object({ id: z.string(), createdAt: z.date() }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit = 10, onlyFollowing } = input;

      const tweets = await ctx.db.tweet.findMany({
        take: limit + 1,
        where: !onlyFollowing
          ? undefined
          : { author: { followers: { some: { from: ctx.session.user.id } } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        cursor: cursor ? { id_createdAt: cursor } : undefined,
        select: {
          id: true,
          text: true,
          createdAt: true,
          author: {
            select: { id: true, image: true, name: true, email: true },
          },
        },
      });

      return {
        tweets: tweets.slice(0, limit),
        nextCursor:
          tweets.length <= limit
            ? undefined
            : {
                id: tweets[tweets.length - 1]!.id,
                createdAt: tweets[tweets.length - 1]!.createdAt,
              },
      };
    }),
});
