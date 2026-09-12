// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { flushSync, mount, unmount } from 'svelte';
import IrealScore from '../components/IrealScore.svelte';
import type { SourceScore } from './chord-metadata';
import './chart-print.css';

export function prepareChartPrint(score: SourceScore, symbols: string[], title: string, subtitle: string, context: Map<unknown, unknown>): () => void {
  const output = document.createElement('article');
  output.className = 'chart-print';
  const heading = document.createElement('h1');
  heading.textContent = title;
  const credits = document.createElement('p');
  credits.textContent = subtitle;
  output.append(heading, credits);
  document.body.append(output);
  const chart = mount(IrealScore, { target: output, context, props: { blocks: score.blocks, symbols } });
  flushSync();
  return () => { void unmount(chart); output.remove(); };
}
