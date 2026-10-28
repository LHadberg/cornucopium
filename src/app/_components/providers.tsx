"use client";

import { createTheme, MantineProvider, type CSSVariablesResolver } from "@mantine/core";
import { SessionProvider } from "next-auth/react";

const theme = createTheme({
  primaryColor: "control",
  primaryShade: 6,
  autoContrast: true,
  colors: {
    control: ["#fafafa", "#f5f5f5", "#efefef", "#eaeaea", "#e6e6e6", "#e2e2e2", "#dedede", "#c6c6c6", "#a6a6a6", "#777777"],
  },
});

// Keep neutral outlined/subtle controls legible on both page backgrounds.
const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-control-text": "#555555",
    "--mantine-color-control-outline": "#777777",
    "--mantine-color-control-light-color": "#555555",
    "--mantine-color-control-light": "rgba(85, 85, 85, 0.10)",
    "--mantine-color-control-light-hover": "rgba(85, 85, 85, 0.18)",
  },
  dark: {
    "--mantine-color-control-text": "#dedede",
    "--mantine-color-control-outline": "#dedede",
    "--mantine-color-control-light-color": "#dedede",
    "--mantine-color-control-light": "rgba(222, 222, 222, 0.14)",
    "--mantine-color-control-light-hover": "rgba(222, 222, 222, 0.24)",
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="auto">{children}</MantineProvider>
    </SessionProvider>
  );
}
