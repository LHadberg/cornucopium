import { Stack } from "@mantine/core";
import { auth } from "~/server/auth";
import { MtgCompleteGrid } from "./_components/mtg-complete-grid";
import { MtgCompleteTitle, MtgUnauthenticatedView } from "./_components/mtg-page-client";

export default async function MtgComplete() {
  const session = await auth();

  if (!session?.user) {
    return <MtgUnauthenticatedView />;
  }

  return (
    <Stack>
      <MtgCompleteTitle />
      <MtgCompleteGrid />
    </Stack>
  );
}
