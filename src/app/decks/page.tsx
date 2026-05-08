import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { DecksClient } from "./_components/decks-client";

export default async function DecksPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const [promptStatus, mtgSelections] = await Promise.all([
    api.decks.getImportPromptStatus(),
    api.mtg.getSelections(),
  ]);

  const populatedMtgDecks = mtgSelections.filter((s) => !!s.commanderName);

  return (
    <DecksClient
      importPromptSeen={promptStatus.seen}
      mtgDecks={populatedMtgDecks}
    />
  );
}
