import { auth } from "~/server/auth";
import { HomeTools } from "./_components/home/home-tools";

export default async function Home() {
  const session = await auth();
  return <HomeTools signedIn={Boolean(session?.user)} />;
}
