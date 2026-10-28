import Link from "next/link";
import { type CSSProperties } from "react";
import { IconArrowUpRight } from "@tabler/icons-react";
import { tools, type Tool } from "./catalog";
import styles from "./home.module.css";

type Props = { signedIn: boolean };
function Actions({ tool, signedIn }: Props & { tool: Tool }) {
  return <div className={styles.actions}><Link href={tool.auth && !signedIn ? `/api/auth/signin?callbackUrl=${encodeURIComponent(tool.href)}` : tool.href}>{tool.auth && !signedIn ? "Sign in to start" : tool.action}<IconArrowUpRight size={17} /></Link>{tool.example && !signedIn && <Link className={styles.example} href={tool.example}>View example</Link>}</div>;
}
export function HomeTools({ signedIn }: Props) {
  return (
    <section className={styles.launchpad} aria-label="Cornucopium tools">
      <div className={styles.launchGrid} aria-label="Available tools">
        {tools.map(tool => (
          <article key={tool.id} style={{ "--accent": tool.color } as CSSProperties}>
            <div className={styles.launchArt}>
              <span className={styles.toolIcon}><tool.icon size={48} stroke={1.5} aria-hidden="true" /></span>
              <span>{tool.category}</span>
            </div>
            <div className={styles.launchBody}>
              <h2>{tool.title}</h2>
              <p>{tool.short}</p>
              <Actions tool={tool} signedIn={signedIn} />
            </div>
          </article>
        ))}
      </div>
      <footer className={styles.footer}>MTG data by <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a>. Not affiliated with Wizards of the Coast.</footer>
    </section>
  );
}

