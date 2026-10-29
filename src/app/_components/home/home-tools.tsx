"use client";

import Link from "next/link";
import { type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import "../../dice-roller/_i18n/i18n";
import { IconArrowUpRight } from "@tabler/icons-react";
import { tools, type Tool } from "./catalog";
import styles from "./home.module.css";

type Props = { signedIn: boolean };
function Actions({ tool, signedIn }: Props & { tool: Tool }) {
  const { t } = useTranslation();
  return <div className={styles.actions}><Link href={tool.auth && !signedIn ? `/api/auth/signin?callbackUrl=${encodeURIComponent(tool.href)}` : tool.href}>{tool.auth && !signedIn ? t("home.signInToStart") : t(`home.tools.${tool.id}.action`)}<IconArrowUpRight size={17} /></Link>{tool.example && !signedIn && <Link className={styles.example} href={tool.example}>{t("home.viewExample")}</Link>}</div>;
}
export function HomeTools({ signedIn }: Props) {
  const { t } = useTranslation();
  return (
    <section className={styles.launchpad} aria-label={t("home.toolsLabel")}>
      <div className={styles.launchGrid} aria-label={t("home.availableTools")}>
        {tools.map(tool => (
          <article key={tool.id} style={{ "--accent": tool.color } as CSSProperties}>
            <div className={styles.launchArt}>
              <span className={styles.toolIcon}><tool.icon size={48} stroke={1.5} aria-hidden="true" /></span>
              <span>{t(`home.categories.${tool.category}`)}</span>
            </div>
            <div className={styles.launchBody}>
              <h2>{t(`home.tools.${tool.id}.title`)}</h2>
              <p>{t(`home.tools.${tool.id}.short`)}</p>
              <Actions tool={tool} signedIn={signedIn} />
            </div>
          </article>
        ))}
      </div>
      <footer className={styles.footer}>{t("home.dataBy")} <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a>. {t("home.disclaimer")}</footer>
    </section>
  );
}

