# Practice UI

Shared browser modules for `apps/chords/` and `apps/flashcards/`: synthesized audio and guitar pitches, card layout preferences, history helpers, the settings menu, theme and PWA update checks. This package has no app imports or database dependencies.

The apps own their entry points, data, navigation flows, builds and deployment. Storage keys are retained for compatibility; browser origins isolate the two sites.

Run `pnpm --dir packages/practice-ui test`. Both apps type-check the shared TypeScript and Svelte modules they consume.
