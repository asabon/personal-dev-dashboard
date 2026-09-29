---
description: 任意のダッシュボード feature module を追加・変更するときのルール
---

# 任意ダッシュボード機能の追加ルール

任意のダッシュボードカードを追加・変更するときは、このルールに従ってください。

## モジュール構成

- `src/features/modules/<feature-id>/` 以下に機能を追加し、`feature.tsx` から名前付き export `feature` を公開します。
- 実装前に [`src/features/types.ts`](../../src/features/types.ts) と近い既存 feature module を確認します。共通契約の変更が必要でない限り、無関係なアプリケーションコードまで調べる必要はありません。
- [`src/features/registry.ts`](../../src/features/registry.ts) の Vite glob が module を自動検出します。registry に手動登録しないでください。
- 機能固有のデータ取得、カード表示、必要に応じた設定 UI、警告、デモデータは module 内にまとめます。
- 機能固有の設定がなければ `SettingsEditor` は省略します。常時表示するコアカードには `alwaysEnabled` を使います。

## 共通境界

- `FeatureLoadContext` には PAT、ユーザー名、リポジトリ、監視対象 Organization、feature 設定、前回データが渡されます。API 通信は feature module 内に置きます。
- 警告は共通契約 `FeatureAlert` で返します。表示と対象カードへのスクロールはダッシュボード側が担当します。
- 設定は `AppSettings.features[feature.id]` に保存します。設定名の変更や旧設定からの移行が必要な場合は、移行キーを宣言し、`src/services/storage.test.ts` に移行テストを追加します。
- `monitoredOrgs` は Actions と Self-hosted Runners で共有しています。変更・移動する前に利用箇所を検索してください。
- `src/App.tsx`、`src/components/SettingsModal.tsx`、`src/features/registry.ts` に機能固有の分岐を追加しないでください。共通契約の変更が必要な場合は理由を文書化し、影響するすべての feature のテストを更新します。

## テストと検証

- module のロジックテストは、同じディレクトリに `feature.test.ts` として配置します。
- 対象テストは `npm test -- src/features/modules/<feature-id>/feature.test.ts` で実行します。
- `npm run typecheck` を実行します。feature 間の共通契約を変更した場合は、完了前に `npm test` と `npm run build` も実行します。