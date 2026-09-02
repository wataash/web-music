// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  buildCardDocument,
  mediaFilenamesIn,
  renderTemplate,
  resolveMediaReferences,
} from "./template";

describe("renderTemplate", () => {
  it("substitutes fields", () => {
    expect(renderTemplate("{{A}} and {{B}}", { A: "x", B: "y" })).toBe(
      "x and y",
    );
  });

  it("renders unknown fields as empty", () => {
    expect(renderTemplate("[{{Missing}}]", {})).toBe("[]");
  });

  it("keeps positive sections only when the field is non-empty", () => {
    const tmpl = "{{#Fret}}{{String}}-{{Fret}}{{/Fret}}";
    expect(renderTemplate(tmpl, { String: "3", Fret: "5" })).toBe("3-5");
    expect(renderTemplate(tmpl, { String: "3", Fret: "" })).toBe("");
  });

  it("treats '0' as a non-empty section value (open string)", () => {
    const tmpl = "{{#Fret}}open{{/Fret}}";
    expect(renderTemplate(tmpl, { Fret: "0" })).toBe("open");
  });

  it("renders inverted sections when the field is empty", () => {
    const tmpl = "{{^Note}}no note{{/Note}}{{#Note}}{{Note}}{{/Note}}";
    expect(renderTemplate(tmpl, { Note: "" })).toBe("no note");
    expect(renderTemplate(tmpl, { Note: "C" })).toBe("C");
  });

  it("supports nested sections", () => {
    const tmpl = "{{#A}}a{{#B}}b{{/B}}{{/A}}";
    expect(renderTemplate(tmpl, { A: "1", B: "1" })).toBe("ab");
    expect(renderTemplate(tmpl, { A: "1", B: "" })).toBe("a");
    expect(renderTemplate(tmpl, { A: "", B: "1" })).toBe("");
  });

  it("substitutes FrontSide like a field", () => {
    expect(
      renderTemplate("{{FrontSide}}<hr>{{Back}}", {
        FrontSide: "<b>Q</b>",
        Back: "A",
      }),
    ).toBe("<b>Q</b><hr>A");
  });

  it("ignores filters, using the name after the last colon", () => {
    expect(renderTemplate("{{text:Front}}", { Front: "hi" })).toBe("hi");
  });

  it("rejects unbalanced sections", () => {
    expect(() => renderTemplate("{{#A}}x", { A: "1" })).toThrow(/unclosed/);
    expect(() => renderTemplate("x{{/A}}", {})).toThrow(/unmatched/);
  });

  it("rejects mismatched section names", () => {
    expect(() => renderTemplate("{{#A}}x{{/B}}", { A: "1" })).toThrow(
      "mismatched section: opened {{#A}} but closed {{/B}}",
    );
    expect(() =>
      renderTemplate("{{#A}}{{^B}}x{{/A}}{{/B}}", { A: "1", B: "" }),
    ).toThrow("mismatched section: opened {{^B}} but closed {{/A}}");
  });

  it("renders the guitar-fretboard front template shape", () => {
    const tmpl =
      "{{#Fret}}{{String}}-{{Fret}}{{/Fret}}{{#Positions}}{{Note}}{{/Positions}}";
    expect(
      renderTemplate(tmpl, {
        String: "3",
        Fret: "5",
        Note: "C",
        Positions: "",
      }),
    ).toBe("3-5");
    expect(
      renderTemplate(tmpl, {
        String: "",
        Fret: "",
        Note: "C",
        Positions: "3-5 3-17",
      }),
    ).toBe("C");
  });
});

describe("buildCardDocument", () => {
  it("wraps html in a body with the card class", () => {
    const doc = buildCardDocument({
      html: "<p>hi</p>",
      css: ".card { color: red; }",
      nightMode: false,
    });
    expect(doc).toContain('<body class="card"><p>hi</p></body>');
    expect(doc).toContain(".card { color: red; }");
  });

  it("adds AnkiDroid night-mode classes in dark mode", () => {
    const doc = buildCardDocument({ html: "x", css: "", nightMode: true });
    expect(doc).toContain('class="card nightMode night_mode"');
  });

  it("exposes the selected interval keyboard key count to card CSS", () => {
    const doc = buildCardDocument({
      html: "x",
      css: "",
      nightMode: false,
      keyboardKeys: 29,
    });
    expect(doc).toContain('<html data-keyboard-keys="29">');
  });
});

describe("resolveMediaReferences", () => {
  it("rewrites known filenames and leaves others alone", () => {
    const urls = new Map([["a.svg", "blob:x"]]);
    expect(
      resolveMediaReferences('<img src="a.svg"><img src="b.svg">', urls),
    ).toBe('<img src="blob:x"><img src="b.svg">');
  });
});

describe("mediaFilenamesIn", () => {
  it("collects every reference a note makes", () => {
    expect(
      mediaFilenamesIn(
        '<img src="a.svg" alt=""><img src="b.svg">' +
          '<use xlink:href="c.svg"><a href="d.svg">',
      ),
    ).toEqual(["a.svg", "b.svg", "c.svg", "d.svg"]);
    expect(mediaFilenamesIn("C m3")).toEqual([]);
  });
});
