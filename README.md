# discord-bot

TypeScript 製の Discord ボット。ダイスロール・チーム分け・スパム検知・ウェルカムメッセージ機能を持つ。

## 機能

| コマンド / 機能 | 説明 |
|---|---|
| `/dice <notation>` | ダイスを振る（例: `2d6`, `d20`, `3d8+5`） |
| `/team start <count>` | チーム分けの参加募集を開始する |
| `/team close` | 参加締め切り・チームを発表する |
| スパム検知 | 5秒以内に5件以上投稿したユーザーのメッセージを削除・警告 |
| ウェルカムメッセージ | メンバー参加時に指定チャンネルへ自動投稿 |

## 必要なもの

- Node.js 20+
- pnpm
- Discord ボットトークン（[Discord Developer Portal](https://discord.com/developers/applications)）

## セットアップ

```bash
pnpm install
cp .env.example .env
# .env を編集して各値を入力
```

### 環境変数

| 変数 | 説明 |
|---|---|
| `BOT_TOKEN` | Bot タブのトークン |
| `CLIENT_ID` | General Information の Application ID |
| `GUILD_ID` | テストサーバーの ID（開発時のみ） |
| `WELCOME_CHANNEL_ID` | ウェルカムメッセージを送るチャンネルの ID |

Discord の **開発者モード**（設定 → 詳細設定）を ON にするとサーバー・チャンネルの ID をコピーできる。

### Bot の権限設定

Developer Portal → **Bot** タブで以下を ON にする：

- Server Members Intent
- Message Content Intent

招待 URL は **OAuth2 → URL Generator** で生成（Scopes: `bot` + `applications.commands`、Bot Permissions: `Send Messages`, `Manage Messages`, `Add Reactions`, `Read Message History`）。

## 開発

```bash
# スラッシュコマンドをサーバーに登録（初回・コマンド変更時）
pnpm deploy

# 開発サーバー起動（ホットリロードあり）
pnpm dev
```

## ビルド・本番起動

```bash
pnpm build
pnpm start
```

## Railway へのデプロイ

1. GitHub にプッシュ
2. [Railway](https://railway.com) で GitHub リポジトリを接続
3. **Variables** タブに `.env` の内容を追加
4. Build Command: `pnpm build` / Start Command: `node dist/index.js`

## ライセンス

[MIT](LICENSE)
