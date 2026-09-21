// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Locale } from "./types";

export const TRANSLATIONS: Record<
  Locale,
  {
    exportSvg: string;
    key: string;
    scale: string;
    customScale: string;
    tuning: string;
    tuningPreset: string;
    customTuning: string;
    editTuning: string;
    fretSpacing: string;
    equalTemperamentSpacing: string;
    equalWidthSpacing: string;
    notes: string;
    appearance: string;
    noteGrayValue: (label: string) => string;
    settingEditor: string;
    advanced: string;
    copySettingsUrl: string;
    copySettingsUrlCopying: string;
    copySettingsUrlCopied: string;
    copySettingsUrlFailed: string;
    modeTabsLabel: string;
    editMode: string;
    concatMode: string;
    concatInput: string;
    concatHelp: string;
    showExample: string;
    concatEmpty: string;
    concatInvalidLines: (lineNumbers: string) => string;
    concatBoardTitle: (lineNumber: number, key: string, scale: string) => string;
    tokenError: string;
    tuningError: string;
    settingError: string;
    fretboardLabel: (key: string, scale: string) => string;
    localeLabel: string;
  }
> = {
  en: {
    exportSvg: "Export SVG",
    key: "Key",
    scale: "Scale",
    customScale: "Custom",
    tuning: "Tuning",
    tuningPreset: "Preset",
    customTuning: "Custom",
    editTuning: "Edit tuning",
    fretSpacing: "Fret spacing",
    equalTemperamentSpacing: "Equal temperament",
    equalWidthSpacing: "Equal width",
    notes: "Notes",
    appearance: "Appearance",
    noteGrayValue: (label) => `${label} grayscale`,
    settingEditor: "Settings editor",
    advanced: "Advanced",
    copySettingsUrl: "Copy link",
    copySettingsUrlCopying: "Copying...",
    copySettingsUrlCopied: "Copied",
    copySettingsUrlFailed: "Copy failed",
    modeTabsLabel: "Mode",
    editMode: "Fretboard",
    concatMode: "Combine",
    concatInput: "Copied settings URLs",
    concatHelp: "Paste one copied link per line.",
    showExample: "Show example",
    concatEmpty: "No valid copied URLs yet.",
    concatInvalidLines: (lineNumbers) =>
      `These lines do not contain valid copied settings URLs: ${lineNumbers}.`,
    concatBoardTitle: (lineNumber, key, scale) =>
      `Line ${lineNumber}: ${key} ${scale}`,
    tokenError: "Notes must contain exactly 12 line-separated tokens.",
    tuningError: "Tuning must contain one note with octave per line.",
    settingError: "Settings editor must contain valid genscale JSON.",
    fretboardLabel: (key, scale) => `${key} ${scale} guitar scale fretboard`,
    localeLabel: "Language",
  },
  ja: {
    exportSvg: "SVGを書き出し",
    key: "キー",
    scale: "スケール",
    customScale: "カスタム",
    tuning: "チューニング",
    tuningPreset: "プリセット",
    customTuning: "カスタム",
    editTuning: "チューニングを編集",
    fretSpacing: "フレット間隔",
    equalTemperamentSpacing: "平均律",
    equalWidthSpacing: "等幅",
    notes: "Notes",
    appearance: "表示",
    noteGrayValue: (label) => `${label} のグレースケール`,
    settingEditor: "設定エディタ",
    advanced: "詳細設定",
    copySettingsUrl: "リンクをコピー",
    copySettingsUrlCopying: "コピー中...",
    copySettingsUrlCopied: "コピーしました",
    copySettingsUrlFailed: "コピー失敗",
    modeTabsLabel: "モード",
    editMode: "指板",
    concatMode: "結合",
    concatInput: "コピーした設定URL",
    concatHelp: "コピーしたリンクを1行に1つ貼り付けてください。",
    showExample: "例を見る",
    concatEmpty: "有効な設定URLがまだありません。",
    concatInvalidLines: (lineNumbers) =>
      `次の行は有効な設定URLではありません: ${lineNumbers}`,
    concatBoardTitle: (lineNumber, key, scale) =>
      `${lineNumber}行目: ${key} ${scale}`,
    tokenError: "Notes は行区切りで12個にしてください。",
    tuningError: "チューニングは1行に1つ、音名とオクターブで指定してください。",
    settingError: "設定エディタには有効な genscale JSON を入力してください。",
    fretboardLabel: (key, scale) => `${key} ${scale} ギター指板スケール`,
    localeLabel: "言語",
  },
};
