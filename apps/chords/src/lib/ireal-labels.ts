// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Translate parser labels at display time so saved charts and song hashes stay stable.
const labels: Record<string, string> = {
  '曲名': 'Title', '作曲者・アーティスト': 'Composer / artist', '追加情報': 'Additional information',
  'スタイル': 'Style', '原調': 'Original key', '移調設定': 'Transpose setting',
  '伴奏スタイル': 'Accompaniment style', 'テンポ (BPM)': 'Tempo (BPM)', 'コーラス数': 'Choruses',
  '小節線': 'Barline', '開始二重線': 'Opening double barline', '終了二重線': 'Closing double barline',
  '反復開始': 'Start repeat', '反復終了': 'End repeat', '終止線': 'Final barline',
  '前の1小節を反復': 'Repeat previous bar', '前の2小節を反復': 'Repeat previous two bars',
  '直前のコードを反復': 'Repeat previous chord', 'セーニョ': 'Segno', 'コーダ': 'Coda',
  'フェルマータ': 'Fermata', '再生終了小節': 'Playback end', 'セクション': 'Section', '拍子': 'Time signature',
  '以降のコードを狭く表示': 'Narrow chord spacing', '以降のコードを標準幅で表示': 'Standard chord spacing',
  '空きセルなしで次のコードへ': 'Next chord without an empty cell', '空きセル': 'Empty cell',
  '番号なし括弧': 'Ending bracket', 'iReal Proの共有リンクが見つかりません。': 'No iReal Pro sharing link found.',
};

export function irealLabel(label = ''): string {
  return labels[label] ?? label.replace(/^追加情報 (\d+)$/, 'Additional information $1')
    .replace(/^再生設定 (\d+)$/, 'Playback setting $1').replace(/^注記の高さ (\d+)$/, 'Note height $1')
    .replace(/^(\d+)番括弧$/, 'Ending $1').replace(/^段間 (\d+)$/, 'Row spacing $1');
}

// Preserve the serialization used by existing imported-song IDs.
const legacyLabels = Object.fromEntries(Object.entries(labels).map(([ja, en]) => [en, ja]));
export function legacyIrealLabel(label: string): string {
  return legacyLabels[label] ?? label.replace(/^Additional information (\d+)$/, '追加情報 $1')
    .replace(/^Playback setting (\d+)$/, '再生設定 $1').replace(/^Note height (\d+)$/, '注記の高さ $1')
    .replace(/^Ending (\d+)$/, '$1番括弧').replace(/^Row spacing (\d+)$/, '段間 $1');
}
