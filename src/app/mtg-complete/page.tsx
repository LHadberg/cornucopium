import { Stack, Title, Text, Button } from "@mantine/core";
import { auth } from "~/server/auth";
import { MtgCompleteGrid } from "./_components/mtg-complete-grid";

export default async function MtgComplete() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Stack align="center" justify="center" mih={300} gap="sm">
        <Text size="lg" fw={500}>
          Log in to view or create your list
        </Text>
        <Button component="a" href="/api/auth/signin">
          Log in
        </Button>
      </Stack>
    );
  }

  return (
    <Stack>
      <Title order={2}>Mtg Complete</Title>
      <MtgCompleteGrid />
    </Stack>
  );
}
