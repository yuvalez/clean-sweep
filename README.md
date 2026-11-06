# Clean Sweep

Draft a football team on a budget from random scouting options, then try to win all five trophies in one season:
Super Cup, League (38 games), domestic Cup, European Cup and Club World Cup.

- **Club Legends** mode: draft from one club's all-time players (14 clubs, ~1,250 player stints).
- **Global** mode: draft from everyone, play in a league of your choice.
- Difficulty sets your budget, rerolls, options per scout, and how strong the rival **Legends** sides are.
  Rivals are AI-drafted all-time XIs of the other clubs.

## Disclaimer

Unofficial, free, fan-made game. It is not affiliated with, or endorsed by, any club, league or player. Club and player names are used only to identify them. There are no crests or logos, competitions use generic names, and all ratings are this game's own subjective opinion. For feedback or takedown requests, open an issue: https://github.com/yuvalez/clean-sweep/issues

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + dataset tests
npm run build
npm run balance  # Monte Carlo difficulty report: npx tsx scripts/balance.ts [seasons] [draftsPerClub] [difficulty]
```

## Layout

- `src/engine/`: pure TypeScript game engine (no React). Draft, chemistry, strength, match sim, season, odds.
- `src/data/`: clubs, leagues/filler teams, and `players/<club>.ts` (one line per stint: `Name|NAT|from-to|positions|rating`).
- `src/store/gameStore.ts`: Zustand store, persisted to localStorage.
- `src/ui/`: screens (Home → Formation → Draft → Review → Season → Summary) and components.

## Balance (smart AI drafter, default "Balanced" rotation)

| Difficulty | Budget | Rival budget | Clean Sweep (smart AI) | Clean Sweep (naive AI) |
|---|---|---|---|---|
| Easy | €600M | €110M | ~44% | ~32% |
| Normal | €500M | €160M | ~19% | ~6% |
| Hard | €430M | €180M | ~4% | ~2% |
| Legendary | €370M | €190M | ~1.4% | 0% |

A human who builds chemistry and uses the "Rotate" policy with a solid bench should beat the smart AI.
Tune via `src/engine/difficulty.ts` and `SIM` in `src/engine/match.ts`, then rerun `npm run balance`.

## Mid-season decisions

An option on the home screen (on by default). The season pauses until you decide:

- **Two dilemmas** (contract stand-off, dressing-room rift, a bid for a bench player, or whether to rush an injured star back).
- **Winter break**: friendly tour (money, but tired legs), training camp, or rest.
- **January transfer window**: replace up to 2 players from the club's pool. Selling returns 60% of the fee. You pay from the transfer kitty, which starts as unspent draft money plus a board top-up (€60M Easy, €45M Normal, €35M Hard, €25M Legendary).
- **Team talk** before the European knockouts.
- **Tactics** at any time (Squad tab): mentality (defensive / balanced / attacking, trading attack, defence and fatigue) and formation (the best XI for the new shape is picked from the whole squad).

Choices become rating or team modifiers (`Modifier` in `src/engine/types.ts`). Every choice is recorded, so the post-season odds replay your actual decisions. The engine is in `src/engine/decisions.ts`. The balance table above was measured without decisions.

## Languages

English and Hebrew (עברית, right-to-left). Switch with the button in the top corner; the first visit follows the browser language.

- Strings live in `src/i18n/en.ts` (the source of truth) and `src/i18n/he.ts`, which is type-checked to have every key.
- Team names in Hebrew are in `src/i18n/teams.he.ts`. Player names stay in Latin script.
- The engine emits structured messages (`Msg` in `src/engine/types.ts`) for news, notes and match stages; the UI renders them with `fmtMsg`.
- Scores, records and year ranges are wrapped with `ltr()` so they don't flip inside Hebrew text.
- `src/i18n/i18n.test.ts` fails if a team, round, injury or formation is missing a Hebrew translation.

## Deployment

Hosted on Vercel as a static site. `vercel.json` sets the build (`npm test && npm run build`, so failing tests block a deploy), caching (hashed `/assets/*` immutable, `index.html` no-cache) and security headers (a strict CSP with no third-party origins; fonts are self-hosted via `@fontsource`).

- Every push to `main` deploys to production. Pull requests get a preview URL. GitHub Actions (`.github/workflows/ci.yml`) runs tests and the build.
- Rollback: Vercel dashboard → Deployments → pick an earlier deployment → Instant Rollback.
- When the saved-game shape changes, bump `version` and extend `migrate` in `src/store/gameStore.ts`.
- `VITE_SITE_URL` (in `.env`) is the absolute URL used for the social-preview image. Production: https://clean-sweep-three.vercel.app

## Adding players or clubs

Add lines to `src/data/players/<club>.ts`. Ratings are this game's own subjective peak-at-club values.
For a new club, also register it in `src/data/clubs.ts` and `src/data/players/index.ts`, and add its Hebrew name to `src/i18n/teams.he.ts`.
`npm test` checks that every club has enough depth at every position.
