# learnmusic.wataash.com

What the `watalearn` Pages project serves now that the app itself is at
<https://mf.wataash.com/>: a page that moves the reader on, and takes their
study progress with them.

```console
pnpm exec wrangler pages deploy deploy/old-domain --project-name watalearn
```

- `index.html` reads the progress out of this origin's IndexedDB and
  localStorage — neither of which the new domain can reach — packs it into the
  URL fragment, and replaces itself with the new home. A fragment is never sent
  to a server, so it goes from the one browser origin to the other and nowhere
  else. Where there is nothing stored, it simply moves on; where there is too
  much to fit in a URL, it stays put and walks the reader through the backup
  file instead.
- `sw.js` replaces the service worker the PWA left in every browser that
  visited, with one that unregisters itself and empties the caches. Without it
  a returning browser would be served the old app out of its own cache and
  never see this page at all.

The app's half of the hand-off is `apps/flashcards/src/lib/handoff.ts`, and
`apps/flashcards/e2e/old-domain-handoff.spec.ts` drives both halves. Delete all
of it together once the old domain is retired.
