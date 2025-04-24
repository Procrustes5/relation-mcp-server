
# Relation MCP Server

## 概要
このプロジェクトは、Model Context Protocol (MCP)を使用してRelation APIにアクセスするためのサーバーです。
RelationのC機能をMCPを通じて利用できるようにすることで、AIアシスタントからRelationの顧客管理やチケット管理などの機能を簡単に利用できます。

詳しくは [Re:lation開発者ページ](https://developer.ingage.jp)をご覧ください。

## 機能
- 顧客情報の取得・検索・作成
- チケットの検索・更新
- テンプレートの検索
- メール送信
- ラベル一覧取得
- ユーザー一覧取得
- 受信箱一覧取得

## インストール方法
```
npm install
```

## 使用方法
1. 環境変数の設定
```
RELATION_SUBDOMAIN=あなたのサブドメイン
RELATION_API_TOKEN=あなたのAPIトークン
```
### 認証

すべてのAPIの利用にアクセストークンが必要です。

Re:lation 画面左下ツールアイコン（システム設定）より、[API トークン] でアクセストークンを発行・確認することができます。


2. サーバーの起動
```
npm start
```

## 開発方法
```
npm run dev
```

## ライセンス
MIT
