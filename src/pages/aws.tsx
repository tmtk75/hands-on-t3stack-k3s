import { trpc } from "../utils/trpc";
import { Bucket } from "./api/trpc/[trpc]";

export default function Page() {
  const buckets = trpc.aws.listBuckets.useQuery({ limit: 3 });
  if (!buckets.data) {
    return <>Loading...</>;
  }
  return <S3BucketList buckets={buckets.data} />;
}

function S3BucketList({ buckets }: { buckets: Bucket[] }) {
  if (buckets.length === 0) {
    return (
      <>
        <div>No s3 buckets.</div>
        <pre>
          aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket
          my-1st-bucket --region=us-east-1
        </pre>
      </>
    );
  }
  return (
    <ul>
      {buckets.map((r) => (
        <li key={r.name}>
          {r.name}: {r.creationDate}
        </li>
      ))}
    </ul>
  );
}
