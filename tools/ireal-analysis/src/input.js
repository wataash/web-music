// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";

export async function readInput(path, stdin = process.stdin) {
  if (path !== "-") return readFile(path, "utf8");

  stdin.setEncoding("utf8");
  let input = "";
  for await (const chunk of stdin) input += chunk;
  return input;
}
