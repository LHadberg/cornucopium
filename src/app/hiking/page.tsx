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
        // The shell renders /hiking as an immersive route (no navbar, no main
        // padding); the header offset var collapses to 0 when the header hides.
        height: "calc(100dvh - var(--app-shell-header-offset, 60px))",
        overflow: "hidden",
        background: "#101828",
        isolation: "isolate",
      }}
    >
      <HikingApp />
    </div>
  );
}
