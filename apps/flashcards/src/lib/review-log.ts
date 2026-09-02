// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const DEVICE_ID_KEY = "music-flashcards:review-device-id";

let fallbackDeviceId: string | null = null;

export function newReviewEventId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function localDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const created = newReviewEventId();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    fallbackDeviceId ??= newReviewEventId();
    return fallbackDeviceId;
  }
}
