# Design - DuckDB Viewer

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                      Angular Frontend                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Components │  │  Services   │  │  State Management   │  │
│  │  - Sidebar  │  │  - Database │  │  (Signals/RxJS)     │  │
│  │  - Editor   │  │  - Query    │  │                     │  │
│  │  - Table    │  │  - Export   │  │                     │  │
│  │  - Results  │  │  - Tauri    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ Tauri IPC (invoke)
┌────────────────────────────┴────────────────────────────────┐
│                      Tauri Backend (Rust)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Commands   │  │  DuckDB     │  │  Export Handlers    │  │
│  │  - open_db  │  │  Connection │  │  - CSV              │  │
│  │  - query    │  │  Manager    │  │  - Excel            │  │
│  │  - export   │  │             │  │  - Parquet          │  │
│  │  - tables   │  │             │  │  - JSON             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## ディレクトリ構成

```
duckdb-viewer/
├── src/                          # Angular フロントエンド
│   ├── app/
│   │   ├── components/           # UI コンポーネント
│   │   │   ├── sidebar/          # サイドバー（テーブル一覧）
│   │   │   ├── sql-editor/       # SQL エディタ
│   │   │   ├── data-table/       # データテーブル表示
│   │   │   ├── schema-viewer/    # スキーマ表示
│   │   │   └── toolbar/          # ツールバー
│   │   ├── services/             # サービス層
│   │   │   ├── database.service.ts
│   │   │   ├── query.service.ts
│   │   │   └── export.service.ts
│   │   ├── models/               # 型定義
│   │   └── app.component.ts      # ルートコンポーネント
│   ├── assets/
│   └── styles/
├── src-tauri/                    # Tauri バックエンド (Rust)
│   ├── src/
│   │   ├── main.rs               # エントリーポイント
│   │   ├── lib.rs                # ライブラリルート
│   │   ├── commands/             # Tauri コマンド
│   │   │   ├── mod.rs
│   │   │   ├── database.rs       # DB 操作コマンド
│   │   │   ├── query.rs          # クエリ実行コマンド
│   │   │   └── export.rs         # エクスポートコマンド
│   │   ├── db/                   # DuckDB 管理
│   │   │   ├── mod.rs
│   │   │   └── connection.rs
│   │   └── export/               # エクスポート処理
│   │       ├── mod.rs
│   │       ├── csv.rs
│   │       ├── excel.rs
│   │       ├── parquet.rs
│   │       └── json.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
├── angular.json
├── package.json
└── tsconfig.json
```

## コンポーネント設計

### フロントエンド

#### 1. AppComponent（メインレイアウト）
- 3ペインレイアウト（サイドバー、エディタ、結果）
- リサイズ可能なスプリッター

#### 2. SidebarComponent
- データベース接続状態表示
- テーブル一覧（ツリービュー）
- テーブルクリックでスキーマ表示

#### 3. SqlEditorComponent
- Monaco Editor を使用
- SQL シンタックスハイライト
- 自動補完（テーブル名、カラム名）
- 実行ボタン、ショートカット（Ctrl+Enter）

#### 4. DataTableComponent
- 仮想スクロール対応
- ページネーション
- カラムソート
- 行選択機能

#### 5. SchemaViewerComponent
- テーブルのカラム情報表示
- 型、NULL 許可、デフォルト値

#### 6. DashboardComponent
- ダッシュボードのグリッドレイアウト
- ウィジェットのドラッグ&ドロップ配置
- ウィジェットのリサイズ

#### 7. WidgetComponent (各種)
- ChartWidget: Chart.js を使用したグラフ表示
- TableWidget: データテーブル表示
- KpiWidget: KPI/メトリクス表示
- 各ウィジェットはクエリをデータソースとして使用

#### 8. DashboardService
```typescript
export class DashboardService {
  // ダッシュボード設定の永続化 (Tauri Store API)
  async saveDashboard(dashboard: Dashboard): Promise<void>;
  async loadDashboards(): Promise<Dashboard[]>;
  async deleteDashboard(id: string): Promise<void>;
}
```

### バックエンド（Rust）

#### 1. DatabaseManager
```rust
pub struct DatabaseManager {
    path: Option<PathBuf>,
}

impl DatabaseManager {
    // 必要な時のみ接続し、処理後すぐに切断
    fn with_connection<F, T>(&self, f: F) -> Result<T, Error>
    where
        F: FnOnce(&Connection) -> Result<T, Error>
    {
        let conn = Connection::open(&self.path)?;
        let result = f(&conn)?;
        // conn は自動的にドロップされ接続終了
        Ok(result)
    }
}
```
- 接続は必要な時のみ確立
- 処理完了後すぐに接続を解放
- データはメモリに読み込んで処理

#### 2. Tauri Commands
```rust
#[tauri::command]
async fn open_database(path: String) -> Result<DatabaseInfo, String>;

#[tauri::command]
async fn execute_query(sql: String) -> Result<QueryResult, String>;

#[tauri::command]
async fn get_tables() -> Result<Vec<TableInfo>, String>;

#[tauri::command]
async fn get_table_schema(table: String) -> Result<TableSchema, String>;

#[tauri::command]
async fn export_to_csv(path: String, query: String) -> Result<(), String>;

#[tauri::command]
async fn export_to_excel(path: String, query: String) -> Result<(), String>;

#[tauri::command]
async fn export_to_parquet(path: String, query: String) -> Result<(), String>;
```

## データフロー

### SQL 実行フロー
```
1. ユーザーが SQL を入力
2. Ctrl+Enter または実行ボタンクリック
3. Angular Service が Tauri invoke を呼び出し
4. Rust で DuckDB クエリ実行
5. 結果を JSON でフロントエンドに返却
6. DataTable コンポーネントで表示
```

### エクスポートフロー
```
1. ユーザーがエクスポート形式を選択
2. ファイル保存ダイアログ表示
3. Tauri コマンドでエクスポート実行
4. Rust で各形式に変換・保存
5. 完了通知をフロントエンドに返却
```

## 状態管理

Angular Signals を使用したリアクティブ状態管理:

```typescript
// database.service.ts
export class DatabaseService {
  private _isConnected = signal(false);
  private _currentDatabase = signal<string | null>(null);
  private _tables = signal<TableInfo[]>([]);

  readonly isConnected = this._isConnected.asReadonly();
  readonly currentDatabase = this._currentDatabase.asReadonly();
  readonly tables = this._tables.asReadonly();
}
```

## UI デザイン

### レイアウト
```
┌──────────────────────────────────────────────────────────┐
│  [File] [Edit] [View] [Help]                    [─][□][×]│
├────────────┬─────────────────────────────────────────────┤
│            │  ┌─────────────────────────────────────────┐│
│  Tables    │  │ SELECT * FROM users LIMIT 100;         ││
│  ─────────  │  │                                         ││
│  ▼ public  │  │                              [▶ Run]   ││
│    users   │  └─────────────────────────────────────────┘│
│    orders  ├─────────────────────────────────────────────┤
│    items   │  Results (100 rows) | 0.023s    [Export ▼] │
│            │  ┌───────┬───────────┬──────────┬─────────┐│
│            │  │ id    │ name      │ email    │ created ││
│            │  ├───────┼───────────┼──────────┼─────────┤│
│            │  │ 1     │ Alice     │ a@ex.com │ 2024... ││
│            │  │ 2     │ Bob       │ b@ex.com │ 2024... ││
│            │  └───────┴───────────┴──────────┴─────────┘│
└────────────┴─────────────────────────────────────────────┘
```

## 依存ライブラリ

### Rust (Cargo.toml)
```toml
[dependencies]
tauri = { version = "2", features = ["dialog"] }
duckdb = { version = "1.0", features = ["bundled"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
rust_xlsxwriter = "0.79"
csv = "1.3"
parquet = "53"
arrow = "53"
```

### Node.js (package.json)
```json
{
  "dependencies": {
    "@angular/core": "^21.0.0",
    "@angular/material": "^21.0.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-store": "^2.0.0",
    "ngx-monaco-editor-v2": "^21.0.0",
    "chart.js": "^4.0.0",
    "ng2-charts": "^6.0.0",
    "angular-gridster2": "^18.0.0"
  }
}
```
