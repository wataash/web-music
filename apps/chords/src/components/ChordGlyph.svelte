<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { renderMusicTextHtml } from '@web-music/music-notation';
  let { text }: { text: string } = $props();
</script>

{@html renderMusicTextHtml(text)}
