"use client";

import {
  AppShell,
  ActionIcon,
  Burger,
  Divider,
  Group,
  NavLink,
  Text,
  Menu,
  Avatar,
  UnstyledButton,
  Anchor,
  Skeleton,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import {
  IconCards,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Home", href: "/", icon: IconHome },
  { label: "Mtg Complete", href: "/mtg-complete", icon: IconCards },
];

const NAVBAR_WIDTH = 240;
const NAVBAR_COLLAPSED_WIDTH = 60;
const NAVBAR_STORAGE_KEY = "cornucopia-navbar-collapsed";

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ActionIcon
      variant="subtle"
      onClick={() => setColorScheme(computed === "dark" ? "light" : "dark")}
      aria-label="Toggle color scheme"
    >
      {mounted && (computed === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />)}
    </ActionIcon>
  );
}

function AccountButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Skeleton height={28} width={100} radius="sm" />;
  }

  if (!session?.user) {
    return (
      <Anchor component={Link} href="/api/auth/signin" size="sm">
        Sign in
      </Anchor>
    );
  }

  return (
    <Menu width={160} position="bottom-end">
      <Menu.Target>
        <UnstyledButton>
          <Group gap="xs">
            <Avatar src={session.user.image} size="sm" radius="xl" />
            <Text size="sm">{session.user.name}</Text>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={() => signOut()}>Sign out</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDesktopCollapsed(localStorage.getItem(NAVBAR_STORAGE_KEY) === "true");
  }, []);

  const toggleDesktop = () => {
    setDesktopCollapsed((prev) => {
      localStorage.setItem(NAVBAR_STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: desktopCollapsed ? NAVBAR_COLLAPSED_WIDTH : NAVBAR_WIDTH,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">Cornucopia</Text>
          </Group>
          <Group gap="xs">
            <ColorSchemeToggle />
            <AccountButton />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Tooltip
          label={desktopCollapsed ? "Expand" : "Collapse"}
          position="right"
          withArrow
          openDelay={400}
        >
          <UnstyledButton
            visibleFrom="sm"
            onClick={toggleDesktop}
            aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: desktopCollapsed ? "center" : "flex-start",
              gap: 6,
              padding: "6px 8px",
              borderRadius: "var(--mantine-radius-sm)",
              color: "var(--mantine-color-dimmed)",
              width: "100%",
            }}
          >
            {desktopCollapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
            {!desktopCollapsed && <Text size="xs" c="dimmed">Collapse</Text>}
          </UnstyledButton>
        </Tooltip>

        <Divider my="xs" />

        {navLinks.map((link) =>
          desktopCollapsed ? (
            <Tooltip key={link.href} label={link.label} position="right" withArrow openDelay={400}>
              <UnstyledButton
                component={Link}
                href={link.href}
                aria-label={link.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: 36,
                  borderRadius: "var(--mantine-radius-sm)",
                  background: pathname === link.href ? "var(--mantine-color-blue-light)" : undefined,
                  color: pathname === link.href ? "var(--mantine-color-blue-text)" : "var(--mantine-color-dimmed)",
                }}
              >
                <link.icon size={18} />
              </UnstyledButton>
            </Tooltip>
          ) : (
            <NavLink
              key={link.href}
              component={Link}
              href={link.href}
              label={link.label}
              leftSection={<link.icon size={18} />}
              active={pathname === link.href}
            />
          )
        )}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
