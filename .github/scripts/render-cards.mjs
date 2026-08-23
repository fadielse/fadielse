// Renders github-readme-stats cards to static SVGs, so the profile README does
// not depend on a third-party hosted instance.
//
// Env:
//   GRS_DIR - path to a github-readme-stats checkout with prod deps installed
//   PAT_1   - GitHub token used by the stats fetchers
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GRS_DIR = resolve(process.env.GRS_DIR ?? ".grs");
const load = async (file) =>
  (await import(pathToFileURL(resolve(GRS_DIR, file)).href)).default;

const CARDS = [
  {
    handler: "api/index.js",
    out: "assets/stats.svg",
    query: {
      username: "fadielse",
      show_icons: "true",
      include_all_commits: "true",
      theme: "tokyonight",
    },
  },
  {
    handler: "api/top-langs.js",
    out: "assets/top-langs.svg",
    query: {
      username: "fadielse",
      hide: "javascript,html",
      theme: "tokyonight",
      layout: "compact",
    },
  },
];

// The API handlers only ever call res.setHeader() and res.send(), so a stub is
// enough to run them outside of Express/Vercel.
const renderCard = async (card) => {
  const handler = await load(card.handler);
  let body = "";
  await handler({ query: card.query }, { setHeader: () => {}, send: (v) => (body = v) });

  if (!body.includes("<svg")) {
    throw new Error(`${card.out}: handler did not return an SVG`);
  }
  // Failures are rendered as a valid SVG error card, so inspect the content.
  const failure = body.match(
    /Something went wrong[^<]*|Maximum retries exceeded|not whitelisted|blacklisted/i,
  );
  if (failure) {
    throw new Error(`${card.out}: ${failure[0]} (check the PAT_1 secret)`);
  }

  mkdirSync(dirname(card.out), { recursive: true });
  writeFileSync(card.out, body);
  console.log(`rendered ${card.out} (${body.length} bytes)`);
};

for (const card of CARDS) {
  await renderCard(card);
}
