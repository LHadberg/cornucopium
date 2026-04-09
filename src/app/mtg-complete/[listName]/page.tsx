import { Stack, Text, Title } from "@mantine/core";
import { db } from "~/server/db";
import { MtgCompleteGrid, type SelectionRow } from "../_components/mtg-complete-grid";

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
    return (
      <Stack align="center" justify="center" mih={300} gap="xs">
        <Title order={3}>List not found</Title>
        <Text c="dimmed" size="sm">
          No commander collection exists at this address.
        </Text>
      </Stack>
    );
  }

  // Name exists but owner made the page private
  if (!user.mtgPagePublic) {
    return (
      <Stack align="center" justify="center" mih={300} gap="xs">
        <Title order={3}>This list is no longer visible</Title>
        <Text c="dimmed" size="sm">
          The owner has made their commander collection private.
        </Text>
      </Stack>
    );
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
