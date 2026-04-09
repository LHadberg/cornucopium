import { Stack, Title } from "@mantine/core";
import { MtgCompleteGrid } from "./_components/mtg-complete-grid";

export default function MtgComplete() {
  return (
    <Stack>
      <Title order={2}>Mtg Complete</Title>
      <MtgCompleteGrid />
    </Stack>
  );
}
