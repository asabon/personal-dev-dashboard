# 開発・ブランチ・リリース運用ガイド (Development & Release Flow)

## 1. 概要

本プロジェクトは **GitHub Flow** をベースにしつつ、本番（GitHub Pages）への公開は **GitHub Releases (タグ) 駆動** で安全にデプロイする運用を採用します。

これにより、「`main` ブランチには安心してマージできる」開発の快適さと、「利用者に意図しない未完成コードが公開されない」安全性を両立します。

---

## 2. ブランチ戦略 (GitHub Flow)

```
[ feature/xxx ] ──(コミット)──> [ PR 作成 ] ──(レビュー/CI)──> [ main へマージ ]
```

- **`main` ブランチ**:
  - 常に動作可能な最新の開発コードを保持します。
  - 直接 push / commit は禁止されています（GitHub のブランチ保護 + ローカル Git Hook による二重防止）。
  - 必ずトピックブランチから PR 経由でマージします。
- **トピックブランチ (`feature/*`, `fix/*`, `chore/*`)**:
  - 新機能や不具合修正ごとに作成します。
  - 命名例:
    - `feature/actions-usage-card`
    - `fix/token-validation-error`
    - `chore/update-dependencies`

> [!TIP]
> **ローカルでの誤コミット防止設定 (Git Hook)**:
> リポジトリ内の `.githooks/` を有効化するため、初回セットアップ時に以下を実行します。
> ```bash
> git config core.hooksPath .githooks
> ```
> これにより、`main` ブランチでの直接 `git commit` および `git push` が自動でブロックされます。

---

## 3. リリース & デプロイフロー (Release-Driven CD)

### 3.1 ワークフローの全体図

```mermaid
gitGraph
   commit id: "Initial"
   branch feature/new-card
   checkout feature/new-card
   commit id: "機能追加"
   checkout main
   merge feature/new-card id: "PRマージ (※デプロイされない)"
   branch fix/bug
   checkout fix/bug
   commit id: "バグ修正"
   checkout main
   merge fix/bug id: "PRマージ (※デプロイされない)"
   commit id: "v0.1.0 リリース" tag: "Release v0.1.0"
```

### 3.2 なぜ main マージ即公開にしないのか？
1. **未完成機能の誤公開防止**: 複数 PR にまたがる大きな機能開発中、利用者がアクセスする本番 URL に壊れた状態が反映されるのを防ぎます。
2. **リリースバージョンの可視化**: 利用者に対して「どのバージョンが公開されているか（例: `v0.1.0`）」「何が変わったのか」を Release Notes で明示できます。

---

## 4. GitHub Actions CI/CD 設計

### 4.1 CI (継続的インテグレーション)
- **トリガー**: `main` への PR 作成・更新
- **実行内容**:
  - TypeScript 型チェック (`tsc --noEmit`)
  - ESLint 等による静的解析
  - ビルドテスト (`npm run build`)

### 4.2 CD (継続的デプロイ)
- **トリガー**: GitHub Releases で **Published** された時（または `v*` タグの push）
  ```yaml
  on:
    release:
      types: [published]
  ```
- **実行内容**:
  - 依存関係インストール & 本番ビルド
  - ビルド成果物 (`dist/`) を GitHub Pages 環境へ自動デプロイ

---

## 5. 具体的なリリース手順

1. **機能開発 & マージ**:
   - トピックブランチで開発し、ローカル（`npm run dev`）で動作確認。
   - PR を作成し、CI がパスしたことを確認して `main` にマージ。
2. **バージョンタグ付け & リリース作成**:
   - GitHub リポジトリの **Releases** 画面に移動。
   - **Draft a new release** をクリック。
   - タグ名（例: `v0.1.0`）を入力し、リリースノート（新機能・修正点）を記載。
3. **自動公開**:
   - **Publish release** ボタンを押すと、GitHub Actions のデプロイワークフローが起動し、数分で GitHub Pages の本番サイトが更新されます。
