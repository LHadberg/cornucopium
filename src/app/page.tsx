import { auth } from "~/server/auth";
import {
  Stack,
  Title,
  Text,
  SimpleGrid,
  Card,
  ThemeIcon,
  Badge,
  Divider,
  Anchor,
  Group,
  Button,
} from "@mantine/core";
import {
  IconCards,
  IconLayoutGrid,
  IconHeart,
  IconDice,
  IconMapRoute,
  IconArrowRight,
  IconLock,
  type Icon,
} from "@tabler/icons-react";
import Link from "next/link";

type Tool = {
  icon: Icon;
  color: string;
  title: string;
  href: string;
  description: string;
  /** Requires a signed-in account to use. */
  requiresAuth?: boolean;
  /** Optional public example/demo to show when signed out. */
  exampleHref?: string;
  /** Call-to-action label shown on the primary button. */
  cta: string;
};

type Section = {
  category: string;
  blurb: string;
  tools: Tool[];
};

const sections: Section[] = [
  {
    category: "MTG",
    blurb: "Tools for building, showcasing, and playing your Commander collection.",
    tools: [
      {
        icon: IconHeart,
        color: "pink",
        title: "Life Tracker",
        href: "/life-tracker",
        description:
          "A full-screen, multiplayer life counter for the table. Track life totals and damage for the whole pod on one screen.",
        cta: "Open tracker",
      },
      {
        icon: IconCards,
        color: "blue",
        title: "MTG Complete",
        href: "/mtg-complete",
        description:
          "Build and showcase your Commander collection across all 32 color combinations. Scryfall search, full partner support, alternate prints, and shareable lists.",
        requiresAuth: true,
        exampleHref: "/mtg-complete/example",
        cta: "Your collection",
      },
      {
        icon: IconLayoutGrid,
        color: "indigo",
        title: "All Decks",
        href: "/decks",
        description:
          "Browse every deck in your collection in a single grid — a quick overview of what you've built so far.",
        requiresAuth: true,
        cta: "Browse decks",
      },
    ],
  },
  {
    category: "TTRPG",
    blurb: "Tools for the tabletop RPG table.",
    tools: [
      {
        icon: IconDice,
        color: "violet",
        title: "Dice Roller",
        href: "/dice-roller",
        description:
          "A 3D physics-based dice roller with configurable dice sets, custom actions, and stat modifiers. No sign-in required.",
        cta: "Roll some dice",
      },
    ],
  },
  {
    category: "Life",
    blurb: "Tools for everything away from the table.",
    tools: [
      {
        icon: IconMapRoute,
        color: "teal",
        title: "Hiking",
        href: "/hiking",
        description:
          "Plan routes on an interactive map with waypoints, then see distance and elevation gain and export the whole thing to GPX for your watch.",
        cta: "Plan a hike",
      },
    ],
  },
];

function ToolCard({ tool, signedIn }: { tool: Tool; signedIn: boolean }) {
  const locked = tool.requiresAuth && !signedIn;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="sm" h="100%">
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color={tool.color}>
            <tool.icon size={20} />
          </ThemeIcon>
          <Title order={3} size="h4">
            {tool.title}
          </Title>
          {tool.requiresAuth && (
            <Badge
              variant="light"
              color="gray"
              size="xs"
              leftSection={<IconLock size={10} />}
              ml="auto"
            >
              Account
            </Badge>
          )}
        </Group>

        <Text size="sm" c="dimmed" lh={1.6} style={{ flex: 1 }}>
          {tool.description}
        </Text>

        <Group gap="xs" mt="xs">
          {locked ? (
            <>
              <Link href="/api/auth/signin">
                <Button
                  size="sm"
                  color={tool.color}
                  rightSection={<IconArrowRight size={14} />}
                >
                  Sign in to start
                </Button>
              </Link>
              {tool.exampleHref && (
                <Link href={tool.exampleHref}>
                  <Button size="sm" variant="default">
                    See an example
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <Link href={tool.href}>
              <Button
                size="sm"
                color={tool.color}
                rightSection={<IconArrowRight size={14} />}
              >
                {tool.cta}
              </Button>
            </Link>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <Stack gap="xl" py="xl" px={{ base: "md", sm: "xl" }} maw={960} mx="auto">
      <Stack gap="sm" ta="center">
        <Title order={1} size="h1">
          Cornucopium
        </Title>
        <Text size="lg" c="dimmed" maw={560} mx="auto">
          A collection of tools for tabletop gaming and beyond — pick one below to get started.
        </Text>
      </Stack>

      {sections.map((section) => (
        <Stack key={section.category} gap="sm">
          <Divider />
          <Stack gap={2}>
            <Title order={2} size="h3">
              {section.category}
            </Title>
            <Text size="sm" c="dimmed">
              {section.blurb}
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {section.tools.map((tool) => (
              <ToolCard key={tool.href} tool={tool} signedIn={signedIn} />
            ))}
          </SimpleGrid>
        </Stack>
      ))}

      <Divider />

      <Stack gap="xs" ta="center">
        <Text size="sm" c="dimmed">
          MTG card data and images provided by{" "}
          <Anchor href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </Anchor>
          . Not affiliated with Wizards of the Coast.
        </Text>
      </Stack>
    </Stack>
  );
}
