"use client";

import dynamic from "next/dynamic";

const HikingApp = dynamic(
  () => import("./_components/hiking-app").then((mod) => mod.HikingApp),
  { ssr: false },
);

export default function HikingPage() {
  return (
    <div
      style={{
        margin: "calc(-1 * var(--mantine-spacing-md))",
        height: "calc(100svh - var(--app-shell-header-height, 60px))",
        overflow: "hidden",
        background: "#101828",
        isolation: "isolate",
      }}
    >
      <HikingApp />
    </div>
  );
}
