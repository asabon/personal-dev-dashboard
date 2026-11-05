---
description: PR 作成・Push 前の事前コードレビュー実施およびレビュー指摘のチェックリスト還元ルール
---

# コードレビュー運用ルール (`code-review`)

CodeRabbit（無料プラン）のレート制限を節約し、コード品質を継続的に向上させるため、以下の運用ルールを遵守してください。

1. **PR 作成・Push 前の事前コードレビュー実施**:
   - 新規 PR 作成時やレビュー指摘修正の `git push` を行う前に、またユーザーからレビューを依頼された際は、スキル [`.agents/skills/code-review/SKILL.md`](../skills/code-review/SKILL.md) を実行してください。
   - 複数ファイルにまたがる変更では独立したサブエージェント（`research`）に [`.agents/skills/code-review/references/`](../skills/code-review/references/) のチェックリストを用いて差分（`git diff main`）を検査させ、検出された問題をすべてローカルで修正・テスト通過させてから **1 回の Push にまとめて** 反映してください。

2. **外部レビュー指摘の再発防止フィードバック（チェックリストへの追記）**:
   - CodeRabbit やユーザーから PR 上で新たなレビュー指摘を受けた場合、該当箇所のコード修正だけでなく、**再発防止のために汎用化したチェック項目を [`.agents/skills/code-review/references/`](../skills/code-review/references/) 配下の該当ファイルに追記** してください。
