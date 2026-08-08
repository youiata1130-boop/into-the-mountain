# Into the Mountain

木・石・鉄を集めて道具や建物を整え、売却・雇用・攻撃で勝利を目指す2人対戦ボードゲームです。

## オンラインで遊ぶ

[Into the Mountainを開く](https://youiata1130-boop.github.io/into-the-mountain/)

`main` ブランチへ変更をpushすると、GitHub Actionsが自動的にGitHub Pagesへ公開します。

## プレイモード

- `ローカル対戦`: 1台の端末で2人が交互にプレイ
- `CPU対戦`: コンピューターを相手にプレイ
- `部屋を作成 / 参加`: 同じブラウザプロファイルの別ウィンドウ間で同期

> 現在の部屋機能はブラウザの `BroadcastChannel` を使用しています。別PC・別端末間のインターネット対戦には、WebSocketやRealtime Databaseなどのバックエンドが別途必要です。

## ローカルで確認する

`index.html` を直接開くか、任意の静的HTTPサーバーでリポジトリのルートを配信してください。

ゲーム開始前の構成は次のとおりです。

- 山札75枚: 木40・石20・鉄10・木こり1・剣士2・賢者1・災害1
- 各プレイヤーの初期手札3枚
- ゲーム開始時に場札を3枚公開

## フォルダ構成

- `src/game/`: ゲーム状態とカード定義
- `src/ui/`: 画面表示、入力、対戦処理
- `assets/images/`: 種類別のSVGイラスト
- `.github/workflows/deploy-pages.yml`: GitHub Pages自動デプロイ

## デプロイ

ワークフローは次の処理を実行します。

1. JavaScript構文と必須ファイルを検証
2. `index.html`、`src/`、`assets/`を公開用成果物へまとめる
3. GitHub Pagesへデプロイ

手動実行する場合は、GitHubの `Actions` から `Deploy game to GitHub Pages` を選択してください。
