import "@mantine/core/styles.css";
import "~/styles/globals.css";

import { type Metadata } from "next";
import { ColorSchemeScript } from "@mantine/core";

import { TRPCReactProvider } from "~/trpc/react";
import { Providers } from "./_components/providers";
import { Shell } from "./_components/app-shell";

export const metadata: Metadata = {
  title: "Cornucopia",
  description: "Cornucopia",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <TRPCReactProvider>
          <Providers>
            <Shell>{children}</Shell>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
