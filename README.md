# DuckDB Viewer

DuckDB データベースのデータ閲覧・操作ツール。Tauri 2.x + Angular 21 で構築されたデスクトップアプリケーション。

## 機能

- **データベース操作**: DuckDB ファイルのオープン/作成
- **テーブル閲覧**: テーブル一覧表示、スキーマ表示、データ表示
- **SQL 実行**: SQL クエリの実行と結果表示
- **データエクスポート**: CSV, Excel, JSON, Parquet 形式でのエクスポート
- **データインポート**: CSV, Parquet, Excel ファイルのインポート
- **ダッシュボード**: グラフ/テーブル/KPI ウィジェットでデータ可視化（設定永続化対応）
- **サンプルデータ**: テスト用サンプルテーブルの作成

## 開発

### 必要環境

- Node.js 20+
- Rust 1.77+
- npm または pnpm

### セットアップ

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run tauri dev

# ビルド
npm run tauri build
```

## 技術スタック

- **フロントエンド**: Angular 21, Angular Material, Chart.js
- **バックエンド**: Tauri 2.x (Rust), DuckDB 1.4.3
- **UI**: angular-gridster2 (ダッシュボード), ng2-charts (チャート)

## ライセンス

MIT License
