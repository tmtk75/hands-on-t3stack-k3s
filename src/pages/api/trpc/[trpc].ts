import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import { initTRPC } from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import { z } from "zod";

export const t = initTRPC.create();

const aws = t.router({
  listBuckets: t.procedure
    .input(z.object({ limit: z.number() }))
    .query(({ input }) => listBuckets(input.limit)),
});

export const appRouter = t.router({
  aws,
  hello: t.procedure
    .input(
      z
        .object({
          text: z.string().nullish(),
        })
        .nullish()
    )
    .query(({ input }) => {
      return {
        greeting: `hello ${input?.text ?? "world"}`,
      };
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;

// export API handler
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => ({}),
});

export interface Bucket {
  name?: string;
  creationDate?: string;
}

async function listBuckets(limit: number) {
  const c = new S3Client({ endpoint: process.env.AWS_ENDPOINT });
  console.time(`aws:list-buckets`);
  const r = await c.send(new ListBucketsCommand({}));
  console.timeEnd(`aws:list-buckets`)

  if (r.$metadata.httpStatusCode !== 200) {
    throw new Error(`failed to list-buckets.`);
  }
  if (!r.Buckets) {
    throw new Error(`unexpect Regions is missing.`);
  }

  return r.Buckets.slice(0, limit).map((e) => ({
    name: e.Name,
    creationDate: e.CreationDate?.toISOString(),
  }));
}
