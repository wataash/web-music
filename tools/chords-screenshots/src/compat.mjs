// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Both revisions are built against the checkout's installed node_modules, and
// a workspace dependency resolves through it to the checkout's own copy of
// that package. That is only sound while the revision agrees with the
// checkout about what is installed and what those packages contain.
export function compareTrees(checkout, snapshot) {
  const differences = [];
  for (const [file, hash] of Object.entries(checkout)) {
    if (!(file in snapshot)) differences.push({ file, reason: "missing from the revision" });
    else if (snapshot[file] !== hash) differences.push({ file, reason: "differs from the checkout" });
  }
  for (const file of Object.keys(snapshot)) {
    if (!(file in checkout)) differences.push({ file, reason: "not in the checkout" });
  }
  return differences.sort((a, b) => a.file.localeCompare(b.file));
}

export function compatibilityError(ref, differences) {
  const listed = differences.slice(0, 10).map(difference => `  ${difference.file} (${difference.reason})`).join("\n");
  const rest = differences.length > 10 ? `\n  …and ${differences.length - 10} more` : "";
  return new Error(
    `${ref} cannot share the checkout's node_modules: ${differences.length} file(s) differ.\n${listed}${rest}\n` +
    "Install that revision's dependencies and capture it from its own checkout instead.",
  );
}
