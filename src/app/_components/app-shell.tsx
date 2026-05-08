"use client";

import {
  AppShell,
  ActionIcon,
  Box,
  Burger,
  Button,
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
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useEffect, useState } from "react";
import {
  IconCards,
  IconChevronLeft,
  IconChevronRight,
  IconDice,
  IconHome,
  IconLayoutGrid,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import "../dice-roller/_i18n/i18n";

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

function LanguagePicker() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Button.Group>
      {(['en', 'da'] as const).map((lng) => (
        <Button
          key={lng}
          size="xs"
          variant={i18n.language.startsWith(lng) ? 'filled' : 'default'}
          onClick={() => {
            void i18n.changeLanguage(lng);
            localStorage.setItem('i18n-language', lng);
          }}
        >
          {lng.toUpperCase()}
        </Button>
      ))}
    </Button.Group>
  );
}

function AccountButton() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  if (status === "loading") {
    return <Skeleton height={28} width={100} radius="sm" />;
  }

  if (!session?.user) {
    return (
      <Anchor component={Link} href="/api/auth/signin" size="sm">
        {t('nav.signIn')}
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
        <Menu.Item onClick={() => signOut()}>{t('nav.signOut')}</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;
  const pathname = usePathname();
  const { t } = useTranslation();

  const navLinks = [
    { label: t('nav.home'), href: "/", icon: IconHome },
    { label: t('nav.mtgComplete'), href: "/mtg-complete", icon: IconCards },
    { label: t('nav.allDecks'), href: "/decks", icon: IconLayoutGrid },
    { label: t('nav.diceRoller'), href: "/dice-roller", icon: IconDice },
  ];

  useEffect(() => {
    const stored = localStorage.getItem(NAVBAR_STORAGE_KEY);
    setDesktopCollapsed(stored !== "false");
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
            <Group gap={6} align="center">
              <img src="/favicon.svg" alt="Cornucopia" style={{ width: 28, height: 28 }} />
              <Text fw={700} size="lg">Cornucopium</Text>
            </Group>
          </Group>
          <Group gap="xs">
            <ColorSchemeToggle />
            <Box visibleFrom="sm">
              <LanguagePicker />
            </Box>
            <AccountButton />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ display: "flex", flexDirection: "column" }}>
        <Tooltip
          label={desktopCollapsed ? t('nav.expand') : t('nav.collapse')}
          position="right"
          withArrow
          openDelay={400}
        >
          <UnstyledButton
            visibleFrom="sm"
            onClick={toggleDesktop}
            aria-label={desktopCollapsed ? t('nav.expand') : t('nav.collapse')}
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
            {!desktopCollapsed && <Text size="xs" c="dimmed">{t('nav.collapse')}</Text>}
          </UnstyledButton>
        </Tooltip>

        <Divider my="xs" />

        {navLinks.map((link) =>
          desktopCollapsed && !isMobile ? (
            <Tooltip key={link.href} label={link.label} position="right" withArrow openDelay={400}>
              <UnstyledButton
                component={Link}
                href={link.href}
                aria-label={link.label}
                onClick={closeMobile}
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
              onClick={closeMobile}
            />
          )
        )}
        <Box hiddenFrom="sm" mt="auto" pt="xs">
          <Divider mb="xs" />
          <LanguagePicker />
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
