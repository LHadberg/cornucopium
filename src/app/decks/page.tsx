import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { DecksClient } from "./_components/decks-client";

export default async function DecksPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  return <DecksClient />;
}
