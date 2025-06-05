/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ApplicationStatus, UserRole } from "@prisma/client";
import type { ApplicationWithAuthorAndVerifier } from "@/types/fetch-application-action.type";
import { APPLICATIONS_PER_PAGE } from "@/config/server-actions.config";

export const applicationRouter = createTRPCRouter({
  infiniteApplicationsScrollFeed: protectedProcedure
    .input(
      z.object({
        longitude: z.string().min(1),
        latitude: z.string().min(1),
        limit: z.number().optional(),
        cursor: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        cursor,
        limit = APPLICATIONS_PER_PAGE,
        longitude,
        latitude,
      } = input;

      const geoNearPipeline = await ctx.db.$runCommandRaw({
        aggregate: "User",
        pipeline: [
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
              },
              distanceField: "distance",
              spherical: true,
              query: { role: UserRole.APPLICANT },
              key: "location",
              distanceMultiplier: 0.001,
              minDistance: 0,
              maxDistance: 10000000, // 1000 km in meters TODO: transfer it to config later
            },
          },
          {
            $lookup: {
              from: "Application",
              localField: "_id",
              foreignField: "authorId",
              as: "application",
            },
          },
          {
            $unwind: {
              path: "$application",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $lookup: {
              from: "User",
              localField: "application.verifierUserId",
              foreignField: "_id",
              as: "verifier",
            },
          },
          { $unwind: { path: "$verifier", preserveNullAndEmptyArrays: false } },
          { $match: { "application.status": ApplicationStatus.VERIFIED } },
          { $skip: (cursor ? cursor - 1 : 0) * limit },
          { $limit: limit + 1 },
        ],
        cursor: {},
      });

      const applications = (geoNearPipeline.cursor as any).firstBatch.map(
        (item: any) => ({
          id: item.application._id.$oid,
          amount: item.application.amount,
          reason: item.application.reason,
          hide: item.application.hide,
          rating: item.application.rating,
          createdAt: item.application.createdAt?.$date,
          author: {
            id: item._id.$oid,
            email: item.email,
            name: item.name,
            image: item.image,
            location: item.location,
            selfie: item.selfie,
            upiId: item.upiId,
          },
          verifier: {
            id: item.verifier._id.$oid,
            name: item.verifier.name,
            image: item.verifier.image,
            email: item.verifier.email,
          },
          distance: item.distance,
        }),
      ) as ApplicationWithAuthorAndVerifier[];

      return {
        applications: applications.slice(0, limit),
        nextCursor:
          applications.length <= limit ? undefined : cursor ? cursor + 1 : 2,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        upiId: z.string(),
        selfie: z.string(),
        email: z.string().email(),
        longitude: z.number(),
        latitude: z.number(),
        encodedFace: z.array(z.number()),
        rank: z.number(),
        amount: z.number(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(async (tx) => {
        const author = await tx.user.update({
          where: { email: input.email },
          data: {
            upiId: input.upiId,
            selfie: input.selfie,
            location: {
              type: "Point",
              coordinates: [input.longitude, input.latitude],
            },
            faceEmbedding: input.encodedFace,
          },
        });
        if (!author) throw new Error("Author not found");
        await tx.application.create({
          data: {
            authorId: author.id,
            amount: input.amount,
            reason: input.reason,
            rating: input.rank,
            verifierUserId: ctx.session.user.id,
            hide: !input.selfie,
          },
        });
      });
    }),

  bookmark: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .mutation(async ({ ctx, input: { applicationId } }) => {
      await ctx.db.application.update({
        where: { id: applicationId },
        data: {
          bookmarkedUserId: ctx.session.user.id,
          status: ApplicationStatus.BOOKMARKED,
        },
      });
    }),

  unbookmark: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .mutation(async ({ ctx, input: { applicationId } }) => {
      await ctx.db.application.update({
        where: { id: applicationId },
        data: {
          bookmarkedUserId: null,
          status: ApplicationStatus.VERIFIED,
        },
      });
    }),
});
