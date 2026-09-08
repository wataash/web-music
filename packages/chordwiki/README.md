# @web-music/chordwiki

ChordWiki Markdownから記載順のコード列・曲情報・注釈・元の表記を保持する譜面トークンを抽出する。Node.js >=22.5。

外部依存ゼロを保つこと。別リポジトリから pnpm の Git subdirectory 依存として直接インストールするため、`workspace:*` 依存を追加すると外部で解決できなくなる。ビルド・prepare 処理は不要。npm publish は行わず、`private: true` で誤公開を防ぐ。

web-music 内では `workspace:*`、外部では次の依存指定を使う。

```json
"@web-music/chordwiki": "github:wataash/web-music#chordwiki-v0.1.0&path:/packages/chordwiki"
```

```js
import { extractChordWiki } from "@web-music/chordwiki";
```

抽出結果は `{ format, title, artist, originalKey, chords, comments, annotations, score, unmappedSymbols }`。反復は展開しない。コード品質は元の記法を保持し、iReal の表記への正規化は行わない。

もう一方の形式への依存はない。短い汎用 tokenize は各パッケージ内に保持し、独立してインストールできるようにする。両形式の振り分け・CLI は利用側の tools/ireal-analysis/ にある。

```sh
# fish / bash 共通。web-music のルートで実行
pnpm --filter @web-music/chordwiki test
```

テストは自作の合成譜面だけを使う。実譜面の検証は消費側で行い、このパッケージに第三者の譜面や非公開 URL を含めない。
