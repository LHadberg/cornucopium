"use client";

import { Button, Group } from "@mantine/core";
import { IconCards } from "@tabler/icons-react";
import Link from "next/link";

export function HomeButtons({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <Group justify="center" mt="sm">
      {isLoggedIn ? (
        <Button
          component={Link}
          href="/mtg-complete"
          size="md"
          leftSection={<IconCards size={18} />}
        >
          Go to your collection
        </Button>
      ) : (
        <>
          <Button
            component={Link}
            href="/api/auth/signin"
            size="md"
            leftSection={<IconCards size={18} />}
          >
            Sign in to get started
          </Button>
          <Button
            component={Link}
            href="/mtg-complete/example"
            size="md"
            variant="default"
          >
            See an example
          </Button>
        </>
      )}
    </Group>
  );
}
