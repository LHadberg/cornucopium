"use client";

import { Button, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import "../_i18n/i18n";

export function MtgUnauthenticatedView() {
  const { t } = useTranslation();
  return (
    <Stack align="center" justify="center" mih={300} gap="sm">
      <Text size="lg" fw={500}>{t('mtg.page.loginRequired')}</Text>
      <Button component="a" href="/api/auth/signin">{t('mtg.page.loginButton')}</Button>
    </Stack>
  );
}

export function MtgCompleteTitle() {
  const { t } = useTranslation();
  return <Title order={2}>{t('mtg.page.title')}</Title>;
}

export function MtgListNotFound() {
  const { t } = useTranslation();
  return (
    <Stack align="center" justify="center" mih={300} gap="xs">
      <Title order={3}>{t('mtg.page.listNotFound')}</Title>
      <Text c="dimmed" size="sm">{t('mtg.page.listNotFoundDesc')}</Text>
    </Stack>
  );
}

export function MtgListPrivate() {
  const { t } = useTranslation();
  return (
    <Stack align="center" justify="center" mih={300} gap="xs">
      <Title order={3}>{t('mtg.page.listPrivate')}</Title>
      <Text c="dimmed" size="sm">{t('mtg.page.listPrivateDesc')}</Text>
    </Stack>
  );
}
