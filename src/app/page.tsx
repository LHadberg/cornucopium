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
} from "@mantine/core";
import {
  IconPhoto,
  IconShare,
  IconStar,
  IconSearch,
  IconUsers,
  IconTag,
  IconPalette,
  IconCards,
} from "@tabler/icons-react";
import { HomeButtons } from "./_components/home-buttons";

const features = [
  {
    icon: IconCards,
    title: "All 32 Color Combinations",
    description:
      "Track your Commander decks across every possible color combination — from mono-color to five-color and colorless.",
  },
  {
    icon: IconUsers,
    title: "Full Partner Support",
    description:
      "Supports all partner types: Partner, Partner With, and Background commanders. Auto-fetches the linked partner card.",
  },
  {
    icon: IconSearch,
    title: "Scryfall Card Search",
    description:
      "Search for any commander directly from Scryfall with auto-complete, card art previews, and type line info.",
  },
  {
    icon: IconPhoto,
    title: "Alternate Print Picker",
    description:
      "Choose which printing of a card to display. Browse all available editions and pick your favorite art.",
  },
  {
    icon: IconPalette,
    title: "Visual & Condensed Views",
    description:
      "Switch between a card-art-heavy visual mode and a compact condensed view depending on your preference.",
  },
  {
    icon: IconTag,
    title: "Deck Properties",
    description:
      "Tag each deck with archetypes, power bracket (1–5), strategy tags like Combo or Tokens, and a link to your deck list.",
  },
  {
    icon: IconStar,
    title: "Favorite Tags",
    description:
      "Mark one tag as your favorite per deck — shown as a badge in visual mode for a quick overview of your collection.",
  },
  {
    icon: IconShare,
    title: "Public Sharing",
    description:
      "Generate a shareable link with a custom MTG-flavored page name so others can browse your collection.",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <Stack gap="xl" py="xl" px={{ base: "md", sm: "xl" }} maw={960} mx="auto">
      <Stack gap="sm" ta="center">
        <Title order={1} size="h1">
          MTG Complete
        </Title>
        <Text size="lg" c="dimmed" maw={600} mx="auto">
          Build and showcase your Commander collection across every color
          combination. Track decks, pick card art, and share your list with the
          world.
        </Text>
        <HomeButtons isLoggedIn={!!session?.user} />
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Title order={2} size="h3" ta="center">
          Features
        </Title>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
          {features.map((feature) => (
            <Card key={feature.title} withBorder radius="md" p="md">
              <ThemeIcon size="lg" radius="md" mb="sm" variant="light">
                <feature.icon size={20} />
              </ThemeIcon>
              <Text fw={600} size="sm" mb={4}>
                {feature.title}
              </Text>
              <Text size="xs" c="dimmed" lh={1.5}>
                {feature.description}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>

      <Divider />

      <Stack gap="xs" ta="center">
        <Text size="sm" c="dimmed">
          Card data and images provided by{" "}
          <Anchor href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </Anchor>
          . Not affiliated with Wizards of the Coast.
        </Text>
        <Group justify="center" gap="xs">
          <Badge variant="outline" size="sm">
            32 color combinations
          </Badge>
          <Badge variant="outline" size="sm">
            Partner support
          </Badge>
          <Badge variant="outline" size="sm">
            Auto-save
          </Badge>
          <Badge variant="outline" size="sm">
            Public sharing
          </Badge>
        </Group>
      </Stack>
    </Stack>
  );
}
