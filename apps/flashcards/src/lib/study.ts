// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Study queue on top of db.ts + scheduler.ts. A "deck scope" is a deck plus
// all of its subdecks (Anki's `Parent::Child` naming).

import {
  type CardRow,
  db,
  type DeckRow,
  type ModelRow,
  type NoteRow,
  type StateRow,
} from "./db";
import {
  dayNumber,
  deserializeFsrsCard,
  endOfStudyDay,
  type FsrsCard,
  type Grade,
  isLearningState,
  newEmptyCard,
  previewDueDates,
  Rating,
  scheduler,
  serializeFsrsCard,
  startOfStudyDay,
  State,
} from "./scheduler";
import { formatInterval } from "./format";
import {
  addToDailyNewLimit,
  clearDailyNewLimits,
  dailyNewLimit,
  DEFAULT_NEW_PER_DAY,
} from "./daily-limits";
import { localDeviceId, newReviewEventId } from "./review-log";
import { effectiveHiddenDeckNames } from "./deck-hiding";
import { compareDeckNames } from "./deck-visibility";

export const NEW_PER_DAY = DEFAULT_NEW_PER_DAY;

export type DeckCounts = Readonly<{
  newCount: number;
  learnCount: number;
  dueCount: number;
}>;

export type DeckInfo = Readonly<{
  name: string;
  baseName: string;
  depth: number;
  // Decks a package ships turned off: the reader turns them on from the deck
  // list, as with any other.
  hiddenByDefault: boolean;
}> &
  DeckCounts;

export type QueueItem = Readonly<{
  card: CardRow;
  note: NoteRow;
  model: ModelRow;
  template: ModelRow["templates"][number];
  state: StateRow | undefined;
  extraReview: boolean;
}>;

export type ExtraStudyAvailability = Readonly<{
  newRemaining: number;
  forgottenTodayKeys: readonly string[];
  aheadKeys: readonly string[];
}>;

export type StudyScopeOptions = Readonly<{
  // The decks the reader has turned off, or null to fall back to the ones the
  // packages ship off. A deck turned off is not asked about when its parent is
  // studied, and does not count towards it. Left out entirely, nothing is
  // hidden — which is what a deck-level action like resetting wants.
  hiddenDeckNames?: readonly string[] | null;
  includeNote?: (note: NoteRow) => boolean;
}>;

export type NextCardOptions = StudyScopeOptions & Readonly<{
  extraReviewKeys?: ReadonlySet<string>;
}>;

function inScope(deckName: string, scopeName: string): boolean {
  return deckName === scopeName || deckName.startsWith(`${scopeName}::`);
}

type ScopedCard = Readonly<{ card: CardRow; state: StateRow | undefined }>;

async function scopedCards(
  scopeName: string,
  options: StudyScopeOptions = {},
): Promise<readonly ScopedCard[]> {
  const decks = await db.decks.toArray();
  const hidden = hiddenDeckNamesFor(decks, options);
  const dids = new Set(
    decks
      .filter((d) => inScope(d.name, scopeName) && !hidden.has(d.name))
      .map((d) => d.did),
  );
  let cards = (await db.cards.toArray()).filter((c) => dids.has(c.did));
  if (options.includeNote) {
    const notes = await db.notes.bulkGet(cards.map((card) => card.nid));
    cards = cards.filter((_, index) => {
      const note = notes[index];
      return note !== undefined && options.includeNote!(note);
    });
  }
  const states = await db.states.bulkGet(cards.map((c) => c.key));
  return cards.map((card, i) => ({ card, state: states[i] }));
}

function countsOf(
  cards: readonly ScopedCard[],
  now: Date,
  newLimit: number,
): DeckCounts {
  const endOfDay = endOfStudyDay(now).getTime();
  const today = dayNumber(now);
  let newTotal = 0;
  let newDoneToday = 0;
  let learnCount = 0;
  let dueCount = 0;
  for (const { state } of cards) {
    if (!state) {
      newTotal += 1;
      continue;
    }
    if (state.introducedDay === today) newDoneToday += 1;
    if (state.stateKind === "learning" && state.due < endOfDay) learnCount += 1;
    if (state.stateKind === "review" && state.due < endOfDay) dueCount += 1;
  }
  const newAllowance = Math.max(0, newLimit - newDoneToday);
  return {
    newCount: Math.min(newTotal, newAllowance),
    learnCount,
    dueCount,
  };
}

export async function deckCounts(
  scopeName: string,
  now: Date = new Date(),
  options: StudyScopeOptions = {},
): Promise<DeckCounts> {
  return countsOf(
    await scopedCards(scopeName, options),
    now,
    dailyNewLimit(scopeName, now),
  );
}

// A deck the reader has turned off keeps its row in the listing — the deck
// chooser is where it is found again — but its cards are left out of what its
// ancestors count and ask.
function hiddenDeckNamesFor(
  decks: readonly DeckRow[],
  options: StudyScopeOptions,
): ReadonlySet<string> {
  if (options.hiddenDeckNames === undefined) return new Set();
  return new Set(effectiveHiddenDeckNames(options.hiddenDeckNames, decks));
}

export async function listDecksWithCounts(
  now: Date = new Date(),
  options: StudyScopeOptions = {},
): Promise<readonly DeckInfo[]> {
  const decks = await db.decks.toArray();
  const hidden = hiddenDeckNamesFor(decks, options);
  let cards = await db.cards.toArray();
  if (options.includeNote) {
    const notes = await db.notes.bulkGet(cards.map((card) => card.nid));
    cards = cards.filter((_, index) => {
      const note = notes[index];
      return note !== undefined && options.includeNote!(note);
    });
  }
  const states = await db.states.bulkGet(cards.map((c) => c.key));
  const scoped: ScopedCard[] = cards.map((card, i) => ({
    card,
    state: states[i],
  }));
  const didName = new Map(decks.map((d) => [d.did, d.name]));
  const counted = scoped.filter(
    ({ card }) => !hidden.has(didName.get(card.did) ?? ""),
  );
  const hiddenByDefaultByName = new Map(
    decks.map(({ name, hiddenByDefault }) => [name, hiddenByDefault === true]),
  );

  const usedNames = new Set<string>();
  for (const { card } of scoped) {
    const name = didName.get(card.did);
    if (name !== undefined) usedNames.add(name);
  }
  // Show every ancestor of a used deck too, even if it has no direct cards.
  for (const name of [...usedNames]) {
    const parts = name.split("::");
    for (let i = 1; i < parts.length; i++) {
      usedNames.add(parts.slice(0, i).join("::"));
    }
  }

  return [...usedNames]
    .sort(compareDeckNames)
    .map((name) => {
      const parts = name.split("::");
      const subtree = counted.filter(({ card }) =>
        inScope(didName.get(card.did) ?? "", name),
      );
      return {
        name,
        baseName: parts[parts.length - 1],
        depth: parts.length - 1,
        hiddenByDefault: hiddenByDefaultByName.get(name) === true,
        ...countsOf(subtree, now, dailyNewLimit(name, now)),
      };
    });
}

export async function nextCard(
  scopeName: string,
  now: Date = new Date(),
  options: NextCardOptions = {},
): Promise<QueueItem | null> {
  const cards = await scopedCards(scopeName, options);
  const endOfDay = endOfStudyDay(now).getTime();
  const nowMs = now.getTime();
  const today = dayNumber(now);

  const learning = cards
    .filter((c) => c.state?.stateKind === "learning" && c.state.due < endOfDay)
    .sort((a, b) => a.state!.due - b.state!.due);
  const learningDueNow = learning.filter((c) => c.state!.due <= nowMs);
  const reviews = cards
    .filter((c) => c.state?.stateKind === "review" && c.state.due < endOfDay)
    .sort((a, b) => a.state!.due - b.state!.due);
  const newDoneToday = cards.filter(
    (c) => c.state && c.state.introducedDay === today,
  ).length;
  const news =
    dailyNewLimit(scopeName, now) - newDoneToday > 0
      ? cards
          .filter((c) => !c.state)
          .sort(
            (a, b) =>
              a.card.newOrder - b.card.newOrder || a.card.id - b.card.id,
          )
      : [];
  const extraReviews = cards
    .filter((c) => options.extraReviewKeys?.has(c.card.key))
    .sort((a, b) => a.card.id - b.card.id);

  // Priority: intraday learning that is due, scheduled reviews, explicitly
  // requested extra reviews, new cards, then learning cards ahead of schedule
  // (unbounded learn-ahead so a session can be finished in one sitting).
  const picked =
    learningDueNow[0] ??
    reviews[0] ??
    extraReviews[0] ??
    news[0] ??
    learning[0];
  if (!picked) return null;
  return toQueueItem(picked, extraReviews.includes(picked));
}

async function toQueueItem(
  { card, state }: ScopedCard,
  extraReview = false,
): Promise<QueueItem> {
  const note = await db.notes.get(card.nid);
  if (!note) throw new Error(`note ${card.nid} missing for card ${card.id}`);
  const model = await db.models.get(note.mid);
  if (!model) throw new Error(`model ${note.mid} missing for note ${note.id}`);
  const template = model.templates.find((t) => t.ord === card.ord);
  if (!template) {
    throw new Error(`template ord ${card.ord} missing in model ${model.name}`);
  }
  return { card, note, model, template, state, extraReview };
}

export async function extraStudyAvailability(
  scopeName: string,
  excludedReviewKeys: ReadonlySet<string> = new Set(),
  now: Date = new Date(),
  options: StudyScopeOptions = {},
): Promise<ExtraStudyAvailability> {
  const cards = await scopedCards(scopeName, options);
  const scopedKeys = new Set(cards.map(({ card }) => card.key));
  const logs = await db.revlog
    .where("ts")
    .between(startOfStudyDay(now).getTime(), now.getTime(), true, true)
    .reverse()
    .toArray();
  const forgottenTodayKeys: string[] = [];
  const seen = new Set<string>();
  for (const log of logs) {
    if (
      log.rating !== Rating.Again ||
      seen.has(log.key) ||
      excludedReviewKeys.has(log.key) ||
      !scopedKeys.has(log.key)
    ) {
      continue;
    }
    seen.add(log.key);
    forgottenTodayKeys.push(log.key);
  }
  // Reviews scheduled for a later day, soonest first: Anki's "review ahead".
  const endOfDay = endOfStudyDay(now).getTime();
  const aheadKeys = cards
    .filter(
      ({ card, state }) =>
        state?.stateKind === "review" &&
        state.due >= endOfDay &&
        !excludedReviewKeys.has(card.key),
    )
    .sort((a, b) => a.state!.due - b.state!.due)
    .map(({ card }) => card.key);
  return {
    newRemaining: cards.filter(({ state }) => state === undefined).length,
    forgottenTodayKeys,
    aheadKeys,
  };
}

export type ResetPreview = Readonly<{
  totalCount: number;
  studiedCount: number;
  reviewCount: number;
  subdeckCount: number;
}>;

export const EMPTY_RESET_PREVIEW: ResetPreview = {
  totalCount: 0,
  studiedCount: 0,
  reviewCount: 0,
  subdeckCount: 0,
};

// Resetting ignores the note selection: it is a
// deck-level action, and a preview whose numbers moved with the settings would
// say nothing about what is actually stored.
export async function resetPreview(scopeName: string): Promise<ResetPreview> {
  const cards = await scopedCards(scopeName);
  const keys = cards.map(({ card }) => card.key);
  const studied = cards.filter(({ state }) => state !== undefined).length;
  const reviews = await db.revlog.where("key").anyOf(keys).count();
  const decks = await db.decks.toArray();
  return {
    totalCount: cards.length,
    studiedCount: studied,
    reviewCount: reviews,
    subdeckCount: decks.filter(({ name }) => name.startsWith(`${scopeName}::`))
      .length,
  };
}

// Every card in the deck and its subdecks goes back to new. The card rows
// themselves are untouched, and `newOrder` lives there, so the deck is
// introduced again in its original order.
export async function resetDeckProgress(scopeName: string): Promise<void> {
  const cards = await scopedCards(scopeName);
  const keys = cards.map(({ card }) => card.key);
  await db.transaction("rw", [db.states, db.revlog], async () => {
    await db.states.bulkDelete([...keys]);
    // Reviews of a card that is new again would otherwise resurface it as
    // "forgotten today" in the study-more dialog.
    await db.revlog.where("key").anyOf(keys).delete();
  });
  clearDailyNewLimits(scopeName);
}

export function addNewCardsForToday(
  scopeName: string,
  amount: number,
  now: Date = new Date(),
): number {
  return addToDailyNewLimit(scopeName, amount, now);
}

function fsrsCardOf(state: StateRow | undefined, now: Date): FsrsCard {
  return state ? deserializeFsrsCard(state.fsrs) : newEmptyCard(now);
}

export async function answerCard(
  item: QueueItem,
  grade: Grade,
  now: Date = new Date(),
): Promise<void> {
  const prior = fsrsCardOf(item.state, now);
  const next = scheduler.repeat(prior, now)[grade].card;
  const eventId = newReviewEventId();
  const stateRow: StateRow = {
    key: item.card.key,
    fsrs: serializeFsrsCard(next),
    due: next.due.getTime(),
    stateKind: isLearningState(next.state) ? "learning" : "review",
    introducedDay: item.state?.introducedDay ?? dayNumber(now),
    updatedAt: now.getTime(),
    updatedBy: eventId,
  };
  await db.transaction("rw", [db.states, db.revlog], async () => {
    await db.states.put(stateRow);
    await db.revlog.add({
      eventId,
      deviceId: localDeviceId(),
      key: item.card.key,
      rating: grade,
      ts: now.getTime(),
    });
  });
}

export function answerButtonLabels(
  item: QueueItem,
  now: Date = new Date(),
): Record<Grade, string> {
  const dues = previewDueDates(fsrsCardOf(item.state, now), now);
  const label = (due: Date): string =>
    formatInterval(due.getTime() - now.getTime());
  return {
    [Rating.Again]: label(dues[Rating.Again]),
    [Rating.Hard]: label(dues[Rating.Hard]),
    [Rating.Good]: label(dues[Rating.Good]),
    [Rating.Easy]: label(dues[Rating.Easy]),
  };
}

export { Rating, State };
