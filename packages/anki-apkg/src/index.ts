// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Modern Anki package (collection.anki21b) support: sqlite schema V18 with
// protobuf-encoded config blobs, plus the protobuf media index. Byte formats
// mirror what anki 26.08 itself exports (rslib/src/import_export/package/,
// rslib/src/storage/upgrades/, proto/anki/*.proto in the Anki source).
//
// This module is shared by every deck generator in this workspace.
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { zstdCompressSync } from "node:zlib";

const FIELD_SEPARATOR = "\u001f";
// Deck name components are separated by \x1f in schema V18 (:: is legacy).
const DECK_NAME_SEPARATOR = "\u001f";

// PackageMetadata { version: VERSION_LATEST (3) }
export const ANKI21B_META = new Uint8Array([0x08, 0x03]);

export type Anki21bTemplate = Readonly<{
  ord: number;
  name: string;
  qfmt: string;
  afmt: string;
}>;

export type Anki21bCardRequirement = Readonly<{
  cardOrd: number;
  kind: "none" | "any" | "all";
  fieldOrds: readonly number[];
}>;

export type Anki21bModel = Readonly<{
  id: number;
  name: string;
  css: string;
  fieldNames: readonly string[];
  templates: readonly Anki21bTemplate[];
  sortFieldIndex: number;
  requirements: readonly Anki21bCardRequirement[];
}>;

export type Anki21bDeck = Readonly<{
  id: number;
  name: string; // "::"-separated, like legacy deck names
  description: string;
  configId: number;
}>;

export type Anki21bDeckConfig = Readonly<{
  id: number;
  name: string;
  newCardGatherPriority: number; // DeckConfig.Config.NewCardGatherPriority
  newCardSortOrder: number; // DeckConfig.Config.NewCardSortOrder
}>;

export type Anki21bNote = Readonly<{
  id: number;
  guid: string;
  modelId: number;
  fields: readonly string[];
  tags: readonly string[];
}>;

export type Anki21bCard = Readonly<{
  id: number;
  noteId: number;
  deckId: number;
  ord: number;
  due: number; // position for new cards
}>;

export type Anki21bCollectionInput = Readonly<{
  models: readonly Anki21bModel[];
  decks: readonly Anki21bDeck[];
  deckConfigs: readonly Anki21bDeckConfig[];
  notes: readonly Anki21bNote[];
  cards: readonly Anki21bCard[];
  modifiedAt: Date;
}>;

// ---------------------------------------------------------------------------
// Minimal protobuf encoding (only what the V18 blobs need)

function varint(value: number | bigint): number[] {
  let v = BigInt(value);
  if (v < 0n) v += 1n << 64n; // two's complement for negative int64
  const out: number[] = [];
  for (;;) {
    const byte = Number(v & 0x7fn);
    v >>= 7n;
    if (v === 0n) {
      out.push(byte);
      return out;
    }
    out.push(byte | 0x80);
  }
}

class ProtoWriter {
  private parts: number[] = [];

  uint(field: number, value: number | bigint): this {
    if (typeof value === "number" ? value !== 0 : value !== 0n) {
      this.parts.push(...varint((field << 3) | 0), ...varint(value));
    }
    return this;
  }

  bytes(field: number, data: Uint8Array): this {
    if (data.length > 0) {
      this.parts.push(...varint((field << 3) | 2), ...varint(data.length), ...data);
    }
    return this;
  }

  string(field: number, value: string): this {
    return this.bytes(field, new TextEncoder().encode(value));
  }

  message(field: number, writer: ProtoWriter): this {
    const data = writer.finish();
    // Unlike bytes(), an empty nested message is still emitted so that
    // presence is preserved (e.g. DeckKindContainer.normal with defaults).
    this.parts.push(...varint((field << 3) | 2), ...varint(data.length), ...data);
    return this;
  }

  packedUints(field: number, values: readonly number[]): this {
    if (values.length > 0) {
      this.bytes(field, new Uint8Array(values.flatMap((v) => varint(v))));
    }
    return this;
  }

  finish(): Uint8Array {
    return new Uint8Array(this.parts);
  }
}

// Splices extra varint fields into an existing encoded message, keeping
// records ordered by field number (prost's canonical output order).
export function mergeVarintFields(
  base: Uint8Array,
  extra: readonly { field: number; value: number }[],
): Uint8Array {
  type Record = { field: number; bytes: Uint8Array };
  const records: Record[] = [];
  let pos = 0;
  const readVarint = (): number => {
    let shift = 0;
    let value = 0;
    for (;;) {
      const byte = base[pos++];
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return value;
      shift += 7;
    }
  };
  while (pos < base.length) {
    const start = pos;
    const tag = readVarint();
    const field = tag >> 3;
    const wire = tag & 7;
    if (wire === 0) readVarint();
    else if (wire === 1) pos += 8;
    else if (wire === 2) {
      // note: `pos += readVarint()` would read the stale `pos` before the
      // side effect inside readVarint() runs
      const length = readVarint();
      pos += length;
    } else if (wire === 5) pos += 4;
    else throw new Error(`unsupported wire type ${wire}`);
    records.push({ field, bytes: base.subarray(start, pos) });
  }
  for (const { field, value } of extra) {
    if (value === 0) continue; // proto3 default, omit
    records.push({
      field,
      bytes: new Uint8Array([...varint((field << 3) | 0), ...varint(value)]),
    });
  }
  records.sort((a, b) => a.field - b.field);
  const total = records.reduce((n, r) => n + r.bytes.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const record of records) {
    out.set(record.bytes, offset);
    offset += record.bytes.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Config blobs

const LATEX_PRE = `\\documentclass[12pt]{article}
\\special{papersize=3in,5in}
\\usepackage[utf8]{inputenc}
\\usepackage{amssymb,amsmath}
\\pagestyle{empty}
\\setlength{\\parindent}{0in}
\\begin{document}
`;
const LATEX_POST = "\\end{document}";

const REQUIREMENT_KIND = { none: 0, any: 1, all: 2 } as const;

// Notetype.Config (proto/anki/notetypes.proto)
function notetypeConfigBlob(model: Anki21bModel): Uint8Array {
  const writer = new ProtoWriter()
    .uint(2, model.sortFieldIndex)
    .string(3, model.css)
    .string(5, LATEX_PRE)
    .string(6, LATEX_POST);
  for (const req of model.requirements) {
    writer.message(
      8,
      new ProtoWriter()
        .uint(1, req.cardOrd)
        .uint(2, REQUIREMENT_KIND[req.kind])
        .packedUints(3, req.fieldOrds),
    );
  }
  return writer.finish();
}

// Notetype.Field.Config
function fieldConfigBlob(): Uint8Array {
  return new ProtoWriter().string(3, "Arial").uint(4, 20).finish();
}

// Notetype.Template.Config
function templateConfigBlob(template: Anki21bTemplate): Uint8Array {
  return new ProtoWriter()
    .string(1, template.qfmt)
    .string(2, template.afmt)
    .finish();
}

// Deck.KindContainer { normal { config_id, description } }
function deckKindBlob(configId: number, description: string): Uint8Array {
  return new ProtoWriter()
    .message(
      1,
      new ProtoWriter().uint(1, configId).string(4, description),
    )
    .finish();
}

// DeckConfig.Config with Anki 26.08 defaults, captured from a reference
// export (learn steps 1m/10m, 20 new/day, 200 reviews/day, ...).
const DEFAULT_DECK_CONFIG_BLOB = Uint8Array.from(
  (
    "0A080000803F00002041120400002041221C0000803F0000803F0000803F0000803F" +
    "0000803F0000803F0000803F481450C8015D00002040656666A63F6D9A99993F7D00" +
    "00803F8001949D02880101900101980104A80101B00108C0013CAD026666663FC502" +
    "6666663FE00201"
  )
    .match(/../g)!
    .map((h) => Number.parseInt(h, 16)),
);

function deckConfigBlob(config: Anki21bDeckConfig): Uint8Array {
  return mergeVarintFields(DEFAULT_DECK_CONFIG_BLOB, [
    { field: 32, value: config.newCardSortOrder },
    { field: 34, value: config.newCardGatherPriority },
  ]);
}

// Deck.Common for the default deck: study_collapsed + browser_collapsed.
const DEFAULT_DECK_COMMON = new Uint8Array([0x08, 0x01, 0x10, 0x01]);
const DEFAULT_DECK_KIND = new Uint8Array([0x0a, 0x02, 0x08, 0x01]);

// ---------------------------------------------------------------------------
// Collection database (schema V18)

// From the Anki source (schema11.sql + schema14/15/17/18 upgrades), minus the
// custom `unicase` collation, which Anki registers at runtime and which is
// not needed for the data to be read back.
const SCHEMA_V18 = `
CREATE TABLE col (
  id integer PRIMARY KEY,
  crt integer NOT NULL,
  mod integer NOT NULL,
  scm integer NOT NULL,
  ver integer NOT NULL,
  dty integer NOT NULL,
  usn integer NOT NULL,
  ls integer NOT NULL,
  conf text NOT NULL,
  models text NOT NULL,
  decks text NOT NULL,
  dconf text NOT NULL,
  tags text NOT NULL
);
CREATE TABLE notes (
  id integer PRIMARY KEY,
  guid text NOT NULL,
  mid integer NOT NULL,
  mod integer NOT NULL,
  usn integer NOT NULL,
  tags text NOT NULL,
  flds text NOT NULL,
  sfld integer NOT NULL,
  csum integer NOT NULL,
  flags integer NOT NULL,
  data text NOT NULL
);
CREATE TABLE cards (
  id integer PRIMARY KEY,
  nid integer NOT NULL,
  did integer NOT NULL,
  ord integer NOT NULL,
  mod integer NOT NULL,
  usn integer NOT NULL,
  type integer NOT NULL,
  queue integer NOT NULL,
  due integer NOT NULL,
  ivl integer NOT NULL,
  factor integer NOT NULL,
  reps integer NOT NULL,
  lapses integer NOT NULL,
  left integer NOT NULL,
  odue integer NOT NULL,
  odid integer NOT NULL,
  flags integer NOT NULL,
  data text NOT NULL
);
CREATE TABLE revlog (
  id integer PRIMARY KEY,
  cid integer NOT NULL,
  usn integer NOT NULL,
  ease integer NOT NULL,
  ivl integer NOT NULL,
  lastIvl integer NOT NULL,
  factor integer NOT NULL,
  time integer NOT NULL,
  type integer NOT NULL
);
CREATE TABLE deck_config (
  id integer PRIMARY KEY NOT NULL,
  name text NOT NULL,
  mtime_secs integer NOT NULL,
  usn integer NOT NULL,
  config blob NOT NULL
);
CREATE TABLE config (
  KEY text NOT NULL PRIMARY KEY,
  usn integer NOT NULL,
  mtime_secs integer NOT NULL,
  val blob NOT NULL
) without rowid;
CREATE TABLE fields (
  ntid integer NOT NULL,
  ord integer NOT NULL,
  name text NOT NULL,
  config blob NOT NULL,
  PRIMARY KEY (ntid, ord)
) without rowid;
CREATE TABLE templates (
  ntid integer NOT NULL,
  ord integer NOT NULL,
  name text NOT NULL,
  mtime_secs integer NOT NULL,
  usn integer NOT NULL,
  config blob NOT NULL,
  PRIMARY KEY (ntid, ord)
) without rowid;
CREATE TABLE notetypes (
  id integer NOT NULL PRIMARY KEY,
  name text NOT NULL,
  mtime_secs integer NOT NULL,
  usn integer NOT NULL,
  config blob NOT NULL
);
CREATE TABLE decks (
  id integer PRIMARY KEY NOT NULL,
  name text NOT NULL,
  mtime_secs integer NOT NULL,
  usn integer NOT NULL,
  common blob NOT NULL,
  kind blob NOT NULL
);
CREATE TABLE tags (
  tag text NOT NULL PRIMARY KEY,
  usn integer NOT NULL,
  collapsed boolean NOT NULL,
  config blob NULL
) without rowid;
CREATE TABLE graves (
  oid integer NOT NULL,
  type integer NOT NULL,
  usn integer NOT NULL,
  PRIMARY KEY (oid, type)
) WITHOUT ROWID;
CREATE UNIQUE INDEX idx_fields_name_ntid ON fields (name, ntid);
CREATE UNIQUE INDEX idx_templates_name_ntid ON templates (name, ntid);
CREATE INDEX idx_templates_usn ON templates (usn);
CREATE UNIQUE INDEX idx_notetypes_name ON notetypes (name);
CREATE INDEX idx_notetypes_usn ON notetypes (usn);
CREATE UNIQUE INDEX idx_decks_name ON decks (name);
CREATE INDEX idx_notes_mid ON notes (mid);
CREATE INDEX idx_cards_odid ON cards (odid) WHERE odid != 0;
CREATE INDEX idx_graves_pending ON graves (usn);
CREATE INDEX ix_notes_usn ON notes (usn);
CREATE INDEX ix_cards_usn ON cards (usn);
CREATE INDEX ix_revlog_usn ON revlog (usn);
CREATE INDEX ix_cards_nid ON cards (nid);
CREATE INDEX ix_cards_sched ON cards (did, queue, due);
CREATE INDEX ix_revlog_cid ON revlog (cid);
CREATE INDEX ix_notes_csum ON notes (csum);
`;

// The study day starts at 04:00 local time; col.crt is the start of the
// creation day.
function creationTimestampSeconds(modifiedAt: Date): number {
  const dayStart = new Date(modifiedAt);
  dayStart.setHours(4, 0, 0, 0);
  if (dayStart.getTime() > modifiedAt.getTime()) {
    dayStart.setDate(dayStart.getDate() - 1);
  }
  return Math.floor(dayStart.getTime() / 1000);
}

function fieldChecksum(value: string): number {
  return Number.parseInt(
    createHash("sha1").update(value).digest("hex").slice(0, 8),
    16,
  );
}

export function writeAnki21bDatabase(
  databasePath: string,
  input: Anki21bCollectionInput,
): void {
  const modifiedSeconds = Math.floor(input.modifiedAt.getTime() / 1000);
  const modifiedMilliseconds = input.modifiedAt.getTime();
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(SCHEMA_V18);
    database.exec("BEGIN");
    try {
      database
        .prepare(
          `INSERT INTO col
           (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
           VALUES (?, ?, ?, ?, 18, 0, 0, 0, '', '', '', '', '')`,
        )
        .run(
          1,
          creationTimestampSeconds(input.modifiedAt),
          modifiedMilliseconds,
          modifiedMilliseconds,
        );

      const insertConfig = database.prepare(
        "INSERT INTO config (KEY, usn, mtime_secs, val) VALUES (?, 0, 0, ?)",
      );
      const configEntries: readonly [string, unknown][] = [
        ["activeDecks", [1]],
        ["addToCur", true],
        ["collapseTime", 1200],
        ["creationOffset", input.modifiedAt.getTimezoneOffset()],
        ["curDeck", 1],
        ["curModel", input.models[0]?.id ?? 1],
        ["dayLearnFirst", false],
        ["dueCounts", true],
        ["estTimes", true],
        ["newSpread", 0],
        ["nextPos", input.notes.length + 1],
        ["sched2021", true],
        ["schedVer", 2],
        ["sortBackwards", false],
        ["sortType", "noteFld"],
        ["timeLim", 0],
      ];
      for (const [key, value] of configEntries) {
        insertConfig.run(key, Buffer.from(JSON.stringify(value)));
      }

      const insertNotetype = database.prepare(
        "INSERT INTO notetypes (id, name, mtime_secs, usn, config) VALUES (?, ?, ?, -1, ?)",
      );
      const insertField = database.prepare(
        "INSERT INTO fields (ntid, ord, name, config) VALUES (?, ?, ?, ?)",
      );
      const insertTemplate = database.prepare(
        "INSERT INTO templates (ntid, ord, name, mtime_secs, usn, config) VALUES (?, ?, ?, 0, 0, ?)",
      );
      for (const model of input.models) {
        insertNotetype.run(
          model.id,
          model.name,
          modifiedSeconds,
          Buffer.from(notetypeConfigBlob(model)),
        );
        model.fieldNames.forEach((name, ord) => {
          insertField.run(model.id, ord, name, Buffer.from(fieldConfigBlob()));
        });
        for (const template of model.templates) {
          insertTemplate.run(
            model.id,
            template.ord,
            template.name,
            Buffer.from(templateConfigBlob(template)),
          );
        }
      }

      const insertDeck = database.prepare(
        "INSERT INTO decks (id, name, mtime_secs, usn, common, kind) VALUES (?, ?, ?, ?, ?, ?)",
      );
      insertDeck.run(
        1,
        "Default",
        0,
        0,
        Buffer.from(DEFAULT_DECK_COMMON),
        Buffer.from(DEFAULT_DECK_KIND),
      );
      for (const deck of input.decks) {
        insertDeck.run(
          deck.id,
          deck.name.split("::").join(DECK_NAME_SEPARATOR),
          modifiedSeconds,
          -1,
          Buffer.alloc(0),
          Buffer.from(deckKindBlob(deck.configId, deck.description)),
        );
      }

      const insertDeckConfig = database.prepare(
        "INSERT INTO deck_config (id, name, mtime_secs, usn, config) VALUES (?, ?, ?, ?, ?)",
      );
      insertDeckConfig.run(
        1,
        "Default",
        0,
        0,
        Buffer.from(DEFAULT_DECK_CONFIG_BLOB),
      );
      for (const config of input.deckConfigs) {
        insertDeckConfig.run(
          config.id,
          config.name,
          modifiedSeconds,
          -1,
          Buffer.from(deckConfigBlob(config)),
        );
      }

      const insertNote = database.prepare(
        `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
         VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')`,
      );
      const allTags = new Set<string>();
      for (const note of input.notes) {
        for (const tag of note.tags) allTags.add(tag);
        const sortField = note.fields[0] ?? "";
        insertNote.run(
          note.id,
          note.guid,
          note.modelId,
          modifiedSeconds,
          note.tags.length > 0 ? ` ${note.tags.join(" ")} ` : "",
          note.fields.join(FIELD_SEPARATOR),
          sortField,
          fieldChecksum(sortField),
        );
      }

      const insertTag = database.prepare(
        "INSERT INTO tags (tag, usn, collapsed, config) VALUES (?, -1, 0, NULL)",
      );
      for (const tag of [...allTags].sort()) insertTag.run(tag);

      const insertCard = database.prepare(
        `INSERT INTO cards
         (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps,
          lapses, left, odue, odid, flags, data)
         VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '{}')`,
      );
      for (const card of input.cards) {
        insertCard.run(
          card.id,
          card.noteId,
          card.deckId,
          card.ord,
          modifiedSeconds,
          card.due,
        );
      }

      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }
}

// ---------------------------------------------------------------------------
// Media index and compression

export type Anki21bMediaFile = Readonly<{
  filename: string;
  data: Uint8Array;
}>;

// MediaEntries { entries: [{ name, size, sha1 }] }; the i-th entry maps to
// the zip entry named String(i).
export function encodeMediaEntries(
  files: readonly Anki21bMediaFile[],
): Uint8Array {
  const writer = new ProtoWriter();
  for (const file of files) {
    writer.message(
      1,
      new ProtoWriter()
        .string(1, file.filename)
        .uint(2, file.data.length)
        .bytes(3, createHash("sha1").update(file.data).digest()),
    );
  }
  return writer.finish();
}

export function decodeMediaEntryNames(data: Uint8Array): string[] {
  const names: string[] = [];
  for (const record of protoRecords(data)) {
    if (record.field !== 1 || record.wire !== 2) continue;
    for (const inner of protoRecords(record.value)) {
      if (inner.field === 1 && inner.wire === 2) {
        names.push(new TextDecoder().decode(inner.value));
      }
    }
  }
  return names;
}

export function decodeProtoVarintField(
  data: Uint8Array,
  field: number,
): number | undefined {
  for (const record of protoRecords(data)) {
    if (record.field === field && record.wire === 0) {
      let value = 0;
      let shift = 0;
      for (const byte of record.value) {
        value += (byte & 0x7f) * 2 ** shift;
        if ((byte & 0x80) === 0) return value;
        shift += 7;
      }
      throw new Error(`unterminated varint in protobuf field ${field}`);
    }
  }
  return undefined;
}

// Modern Anki exports retain a small schema-V11 collection so old clients can
// display an upgrade notice instead of failing with a missing-file error. It
// is intentionally not a copy of the exported deck; all real data lives in
// collection.anki21b.
export function writeLegacyUpgradeNoticeDatabase(
  databasePath: string,
  modifiedAt: Date,
): void {
  const modelId = 1_700_000_000_001;
  const noteId = 1_700_000_000_002;
  const cardId = 1_700_000_000_003;
  const templateId = 1_700_000_000_004;
  const modifiedSeconds = Math.floor(modifiedAt.getTime() / 1000);
  const modifiedMilliseconds = modifiedAt.getTime();
  const front =
    "Please update to the latest Anki version, then import this .apkg file again.";
  const model = {
    id: modelId,
    name: "Basic",
    type: 0,
    mod: modifiedSeconds,
    usn: -1,
    sortf: 0,
    did: null,
    tmpls: [
      {
        id: templateId,
        name: "Card 1",
        ord: 0,
        qfmt: "{{Front}}",
        afmt: "{{FrontSide}}<hr id=answer>{{Back}}",
        bqfmt: "",
        bafmt: "",
        did: null,
        bfont: "",
        bsize: 0,
      },
    ],
    flds: ["Front", "Back"].map((name, ord) => ({
      name,
      ord,
      sticky: false,
      rtl: false,
      font: "Arial",
      size: 20,
      media: [],
    })),
    css: ".card { font-family: arial; font-size: 20px; text-align: center; }",
    latexPre: "",
    latexPost: "",
    req: [[0, "any", [0]]],
  };
  const deck = {
    id: 1,
    name: "Default",
    mod: modifiedSeconds,
    usn: -1,
    lrnToday: [0, 0],
    revToday: [0, 0],
    newToday: [0, 0],
    timeToday: [0, 0],
    collapsed: false,
    browserCollapsed: false,
    desc: "",
    dyn: 0,
    conf: 1,
    extendNew: 0,
    extendRev: 0,
  };
  const deckConfig = {
    id: 1,
    name: "Default",
    mod: modifiedSeconds,
    usn: -1,
    maxTaken: 60,
    autoplay: true,
    timer: 0,
    replayq: true,
    new: {
      bury: false,
      delays: [1, 10],
      initialFactor: 2500,
      ints: [1, 4],
      order: 1,
      perDay: 20,
    },
    rev: {
      bury: false,
      ease4: 1.3,
      ivlFct: 1,
      maxIvl: 36_500,
      perDay: 200,
      hardFactor: 1.2,
    },
    lapse: {
      delays: [10],
      leechAction: 1,
      leechFails: 8,
      minInt: 1,
      mult: 0,
    },
    dyn: false,
  };
  const database = new DatabaseSync(databasePath);
  try {
    database.exec("PRAGMA page_size=512");
    database.exec(SCHEMA_V11_UPGRADE_NOTICE);
    database
      .prepare(
        `INSERT INTO col
         (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
         VALUES (?, ?, ?, ?, 11, 0, -1, 0, ?, ?, ?, ?, '{}')`,
      )
      .run(
        1,
        modifiedSeconds,
        modifiedMilliseconds,
        modifiedMilliseconds,
        JSON.stringify({
          activeDecks: [1],
          curDeck: 1,
          curModel: modelId,
          nextPos: 2,
          schedVer: 2,
        }),
        JSON.stringify({ [modelId]: model }),
        JSON.stringify({ 1: deck }),
        JSON.stringify({ 1: deckConfig }),
      );
    database
      .prepare(
        `INSERT INTO notes
         (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
         VALUES (?, 'anki21b-upgrade', ?, ?, -1, '', ?, ?, ?, 0, '')`,
      )
      .run(
        noteId,
        modelId,
        modifiedSeconds,
        `${front}${FIELD_SEPARATOR}`,
        front,
        fieldChecksum(front),
      );
    database
      .prepare(
        `INSERT INTO cards
         (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps,
          lapses, left, odue, odid, flags, data)
         VALUES (?, ?, 1, 0, ?, -1, 0, 0, 1, 0, 2500, 0, 0, 0, 0, 0, 0, '')`,
      )
      .run(cardId, noteId, modifiedSeconds);
    database.exec("VACUUM");
  } finally {
    database.close();
  }
}

function* protoRecords(
  data: Uint8Array,
): Generator<{ field: number; wire: number; value: Uint8Array }> {
  let pos = 0;
  const readVarint = (): number => {
    let shift = 0;
    let value = 0;
    for (;;) {
      const byte = data[pos++];
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return value;
      shift += 7;
    }
  };
  while (pos < data.length) {
    const tag = readVarint();
    const field = tag >> 3;
    const wire = tag & 7;
    let value: Uint8Array;
    if (wire === 0) {
      const start = pos;
      readVarint();
      value = data.subarray(start, pos);
    } else if (wire === 1) {
      value = data.subarray(pos, (pos += 8));
    } else if (wire === 2) {
      const length = readVarint();
      value = data.subarray(pos, (pos += length));
    } else if (wire === 5) {
      value = data.subarray(pos, (pos += 4));
    } else {
      throw new Error(`unsupported wire type ${wire}`);
    }
    yield { field, wire, value };
  }
}

export function zstdCompress(data: Uint8Array): Buffer {
  return zstdCompressSync(data);
}

export { zstdDecompressSync as zstdDecompress } from "node:zlib";

const SCHEMA_V11_UPGRADE_NOTICE = `
CREATE TABLE col (
  id integer PRIMARY KEY, crt integer NOT NULL, mod integer NOT NULL,
  scm integer NOT NULL, ver integer NOT NULL, dty integer NOT NULL,
  usn integer NOT NULL, ls integer NOT NULL, conf text NOT NULL,
  models text NOT NULL, decks text NOT NULL, dconf text NOT NULL,
  tags text NOT NULL
);
CREATE TABLE notes (
  id integer PRIMARY KEY, guid text NOT NULL, mid integer NOT NULL,
  mod integer NOT NULL, usn integer NOT NULL, tags text NOT NULL,
  flds text NOT NULL, sfld integer NOT NULL, csum integer NOT NULL,
  flags integer NOT NULL, data text NOT NULL
);
CREATE TABLE cards (
  id integer PRIMARY KEY, nid integer NOT NULL, did integer NOT NULL,
  ord integer NOT NULL, mod integer NOT NULL, usn integer NOT NULL,
  type integer NOT NULL, queue integer NOT NULL, due integer NOT NULL,
  ivl integer NOT NULL, factor integer NOT NULL, reps integer NOT NULL,
  lapses integer NOT NULL, left integer NOT NULL, odue integer NOT NULL,
  odid integer NOT NULL, flags integer NOT NULL, data text NOT NULL
);
CREATE TABLE revlog (
  id integer PRIMARY KEY, cid integer NOT NULL, usn integer NOT NULL,
  ease integer NOT NULL, ivl integer NOT NULL, lastIvl integer NOT NULL,
  factor integer NOT NULL, time integer NOT NULL, type integer NOT NULL
);
CREATE TABLE graves (
  usn integer NOT NULL, oid integer NOT NULL, type integer NOT NULL
);
CREATE INDEX ix_notes_usn ON notes (usn);
CREATE INDEX ix_cards_usn ON cards (usn);
CREATE INDEX ix_cards_nid ON cards (nid);
CREATE INDEX ix_cards_sched ON cards (did, queue, due);
CREATE INDEX ix_revlog_usn ON revlog (usn);
CREATE INDEX ix_revlog_cid ON revlog (cid);
`;
