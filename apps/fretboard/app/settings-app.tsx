// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useSearchParams } from "next/navigation";

import GenscaleApp from "./genscale-app";
import type { Locale } from "@/lib/genscale/types";

export default function SettingsApp({ locale }: { locale: Locale }) {
  const settings = useSearchParams().get("settings") ?? undefined;

  return <GenscaleApp key={settings ?? ""} initialSettingsText={settings} locale={locale} />;
}
