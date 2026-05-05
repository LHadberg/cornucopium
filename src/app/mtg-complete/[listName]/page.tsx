import { Stack, Title } from "@mantine/core";
import { db } from "~/server/db";
import { MtgCompleteGrid, type SelectionRow } from "../_components/mtg-complete-grid";
import { MtgListNotFound, MtgListPrivate } from "../_components/mtg-page-client";

export default async function PublicMtgPage({
  params,
}: {
  params: Promise<{ listName: string }>;
}) {
  const { listName } = await params;

  const user = await db.user.findFirst({
    where: { mtgPageName: listName },
    select: {
      name: true,
      mtgPagePublic: true,
      mtgPageName: true,
      commanderSelections: true,
    },
  });

  // Name has never been registered
  if (!user) {
    return <MtgListNotFound />;
  }

  // Name exists but owner made the page private
  if (!user.mtgPagePublic) {
    return <MtgListPrivate />;
  }

  return (
    <Stack>
      <Title order={2}>{user.mtgPageName}</Title>
      <MtgCompleteGrid
        readOnly
        preloadedSelections={user.commanderSelections as SelectionRow[]}
      />
    </Stack>
  );
}
