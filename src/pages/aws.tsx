import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";

interface Bucket {
  name?: string;
  creationDate?: string;
}

interface Props {
  buckets: Bucket[];
}

export default function Page(props: Props) {
  return <S3BucketList {...props} />;
}

export const getServerSideProps: GetServerSideProps = async () => {
  const c = new S3Client({ endpoint: process.env.MY_AWS_ENDPOINT });
  const r = await c.send(new ListBucketsCommand({}));
  if (r.$metadata.httpStatusCode !== 200) {
    throw new Error(`failed to list-buckets.`);
  }
  if (!r.Buckets) {
    throw new Error(`unexpect Regions is missing.`);
  }

  const props: Props = {
    buckets: r.Buckets.map((e) => ({
      name: e.Name,
      creationDate: e.CreationDate?.toISOString(),
    })),
  };
  return {
    props,
  };
};

function S3BucketList({ buckets }: Props) {
  const [values, setValues] = useState<Props["buckets"]>([]);
  useEffect(() => setValues(buckets), [buckets]);
  if (values.length === 0) {
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
      {values.slice(0, 5).map((r) => (
        <li key={r.name}>
          {r.name}: {r.creationDate}
        </li>
      ))}
    </ul>
  );
}
