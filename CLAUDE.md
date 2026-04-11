# Soccer Game Planner

7-on-7 youth soccer rotation manager. Assigns GK, bench, and field positions across 4 quarters (each with 2 halves) for a roster of ~12 players.

## Commands

```bash
export PATH="/c/Program Files/nodejs:$PATH"  # required in this shell
npm run dev       # dev server
npm test          # vitest watch mode
npm run build     # type-check + bundle
```

## Architecture

- `src/algorithm/` — pure functions: `assignGoalies` → `assignBench` → `assignPositions`, orchestrated by `generateRotation`
- `src/hooks/useRotation.ts` — all lock/unlock/reoptimize mutations; reads grid from `game.rotation`, writes via `onGameUpdate`
- `src/constants/game.ts` — single source of truth for positions, `TEAM_SIZE`, `FIELD_POSITIONS`
- `src/types/index.ts` — all shared types
- State persisted to `localStorage` under key `soccer-planner-v1`

## Key constraints

- GK is fixed for the entire quarter (both halves); field positions can change each half
- Algorithm priorities: (1) equal playing time, (2) no consecutive bench stints, (3) position variety
- Manual slot edits create locks; locked slots survive reoptimization

## Development workflow

Use a red-green approach for new features: write failing tests first, then implement until they pass. Tests should be committed in a failing state before feature work begins.
