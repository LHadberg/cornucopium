"use client";

import { Select, type SelectProps } from "@mantine/core";
import { useRef } from "react";

export function ArchetypeSelect(props: SelectProps) {
  const touchPointer = useRef(false);
  return (
    <Select
      {...props}
      // Keep the portal out of document scrolling when the last card is open.
      comboboxProps={{ floatingStrategy: "fixed", ...props.comboboxProps }}
      onPointerDown={(event) => {
        touchPointer.current = event.pointerType === "touch";
        props.onPointerDown?.(event);
      }}
      onMouseDown={(event) => {
        props.onMouseDown?.(event);
        // Focusing the read-only input can move the mobile viewport between
        // pointerdown and click, causing the click to miss the select entirely.
        // Touch selection needs the click, but not native input focus.
        if (touchPointer.current) event.preventDefault();
      }}
    />
  );
}
