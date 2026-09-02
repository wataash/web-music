// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The card-sized staff. Everything about how a staff is drawn lives in the
// core package, shared with the diagrams the app shows next to a note name;
// this module only fixes the geometry the deck's media uses.

import {
  bottomLineY,
  CARD_KEYBOARD_GEOMETRY,
  CARD_STAFF_GEOMETRY,
  clefBaselineY as clefBaselineYFor,
  keyboardLabelPlacement as keyboardLabelPlacementWith,
  renderKeyboardSvg as renderKeyboardSvgWith,
  renderStaffSvg as renderStaffSvgWith,
  staffStepY as staffStepYFor,
  type Clef,
  type KeyboardLayout,
  type KeyboardSvgInput,
  type StaffSvgInput,
} from "@web-music/music-staff-core";

export { CLEF_GLYPHS } from "@web-music/music-staff-core";

export const STAFF = CARD_STAFF_GEOMETRY;

export const BOTTOM_LINE_Y = bottomLineY(CARD_STAFF_GEOMETRY);

export function staffStepY(step: number): number {
  return staffStepYFor(CARD_STAFF_GEOMETRY, step);
}

export function clefBaselineY(clef: Clef): number {
  return clefBaselineYFor(CARD_STAFF_GEOMETRY, clef);
}

export function renderStaffSvg(
  input: Omit<StaffSvgInput, "geometry" | "decorative">,
): string {
  return renderStaffSvgWith({ ...input, geometry: CARD_STAFF_GEOMETRY });
}

export function renderKeyboardSvg(
  input: Omit<KeyboardSvgInput, "geometry" | "decorative">,
): string {
  return renderKeyboardSvgWith({ ...input, geometry: CARD_KEYBOARD_GEOMETRY });
}

export function keyboardLabelPlacement(
  pitch: string,
  layout: KeyboardLayout,
  labelLength: number,
) {
  return keyboardLabelPlacementWith({
    pitch,
    layout,
    labelLength,
    geometry: CARD_KEYBOARD_GEOMETRY,
  });
}
