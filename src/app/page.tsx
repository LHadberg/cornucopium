import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { LatestPost } from "~/app/_components/post";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      {session?.user ? (
        <LatestPost />
      ) : (
        <p>Sign in to get started.</p>
      )}
    </HydrateClient>
  );
}
