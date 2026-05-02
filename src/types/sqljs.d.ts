declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface Database {
    run(sql: string, params?: unknown[]): Database;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array | ArrayLike<number>) => Database;
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
