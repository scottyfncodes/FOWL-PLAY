# FOWL PLAY: notes for contributors and agents

- Run `npm test`, `npm run build` and `npm run e2e` before pushing. CI runs tests and the build on every PR; `main` deploys to GitHub Pages.
- Live: https://scottyfncodes.github.io/FOWL-PLAY/

## Design guardrails

Avoid generic AI-site patterns. Design should always be intentional. Always on purpose.

### Icons & type
- Don't default to Lucide for every icon. Use fewer icons, and pick or draw ones that fit the project.
- No emojis in headings, cards, or button labels.
- No sparkle/AI star icons anywhere.
- Don't default to Inter, Geist, or Space Grotesk. Choose type that fits the project's personality.

### Layout
- No row of 3 identical feature cards with icon + title + one-liner.
- No bento grids of mismatched stat tiles.
- No fake terminal windows or "npx something init" snippets unless the product has a real CLI.
- No placeholder product shots ("screenshot coming soon", gradient boxes in browser chrome). Use real screens or cut the section.

### Color & effects
- No default purple-on-black palette.
- No liquid glass / frosted blur cards over gradient backgrounds.
- No blurred radial gradient orbs as decoration.
- No dot-grid background texture.
- No rainbow-coded cards where each tile gets its own pastel. Color should mean something.

### Motion
- Arrows on buttons only where they mean "go somewhere," no animated arrow nudges.
- Hover effects only on clickable things, and subtle. No lift-and-scale on every card.

### Copy
- No em dashes in UI copy.
- No "It's not X, it's Y" lines.
- No hype phrasing ("blazing fast", "fort-knox secure", "AI magic").
- No made-up stats ("10x", "99.9%", "120+", "∞") unless they're real.

## Visual system: the stud book

The app is styled as a breeder's ledger kept in the barn. Keep new UI inside it (tokens and rules live at the top of `src/styles/main.css`).
- Type: Fraunces for names and titles, Atkinson Hyperlegible for reading, Courier Prime for typed facts (labels, entry numbers, odds, counts). Labels are lower case, never letterspaced caps.
- Ink: terracotta only for actions; moss only for farm abilities; rarity inks only for rarity. Everything else is brown on straw.
- Lists are ruled ledger rows, not stacks of cards. Cards are for things you pick up (a chicken, an egg, the current problem).
- Traits are square rubber stamps; abilities are solid moss tags; page heads sit on a double rule.
