export interface DatabaseInfo {
  path: string;
  tables: string[];
}

export interface TableInfo {
  name: string;
  row_count: number;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  nullable: boolean;
  default_value: string | null;
  is_primary_key: boolean;
}

export interface TableSchema {
  table_name: string;
  columns: ColumnInfo[];
}

export interface QueryResult {
  columns: string[];
  column_types: string[];
  rows: unknown[][];
  row_count: number;
  execution_time_ms: number;
}

export type ExportFormat = 'csv' | 'excel' | 'parquet' | 'json';

export interface ExportOptions {
  file_path: string;
  format: ExportFormat;
  query?: string;
  table_name?: string;
}

export type ImportFormat = 'csv' | 'parquet' | 'excel';

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  query: string;
  x: number;
  y: number;
  cols: number;
  rows: number;
  config: WidgetConfig;
}

export type WidgetType = 'chart' | 'table' | 'kpi';

export interface WidgetConfig {
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut';
  labelColumn?: string;
  valueColumn?: string;
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max';
}
