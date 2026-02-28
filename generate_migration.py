import sqlite3
import os

path_sqlite = "lp_erp.sqlite"
path_sql_out = "migration.sql"

def migrate():
    if not os.path.exists(path_sqlite):
        print(f"Error: {path_sqlite} no existe.")
        return

    conn = sqlite3.connect(path_sqlite)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Obtener todas las tablas
    tables = [row['name'] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]

    with open(path_sql_out, "w", encoding="utf-8") as f:
        f.write("-- LP ERP Migration Script: SQLite to MySQL\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")

        for table in tables:
            # MySQL pre-requisites for TEXT keys
            pk_cols = []
            info = cur.execute(f"PRAGMA table_info({table})").fetchall()
            
            f.write(f"-- Table: {table}\n")
            f.write(f"DROP TABLE IF EXISTS `{table}`;\n")
            f.write(f"CREATE TABLE `{table}` (\n")
            
            cols_def = []
            for col in info:
                name = col['name']
                dtype = col['type'].upper()
                pk = col['pk']
                notnull = "NOT NULL" if col['notnull'] else ""
                default = f"DEFAULT {col['dflt_value']}" if col['dflt_value'] is not None else ""
                
                # Translation
                if dtype == "INTEGER" and pk:
                    mysql_type = "INT AUTO_INCREMENT"
                elif dtype == "INTEGER":
                    mysql_type = "INT"
                elif dtype == "REAL":
                    mysql_type = "DECIMAL(15,2)"
                elif "TEXT" in dtype:
                    # MySQL TEXT/BLOB columns can't have DEFAULT values in some versions/modes.
                    # Also, PK or length-indexed columns must be VARCHAR.
                    if pk or col['dflt_value'] is not None or name in ['codigo', 'folio', 'username', 'k', 'nivel', 'tamano', 'utilidad_nivel', 'estatus', 'tipo']:
                        mysql_type = "VARCHAR(255)"
                    else:
                        mysql_type = "TEXT"
                else:
                    mysql_type = dtype
                
                if pk:
                    pk_cols.append(f"`{name}`")

                cols_def.append(f"  `{name}` {mysql_type} {notnull} {default}")
            
            if pk_cols:
                cols_def.append(f"  PRIMARY KEY ({', '.join(pk_cols)})")
            
            f.write(",\n".join(cols_def))
            f.write("\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n")

            # Inserts
            rows = cur.execute(f"SELECT * FROM `{table}`").fetchall()
            if rows:
                for row in rows:
                    cols = row.keys()
                    vals = []
                    for c in cols:
                        v = row[c]
                        if v is None:
                            vals.append("NULL")
                        elif isinstance(v, str):
                            escaped = v.replace("'", "''")
                            vals.append(f"'{escaped}'")
                        else:
                            vals.append(str(v))
                    
                    f.write(f"INSERT INTO `{table}` (`{'`, `'.join(cols)}`) VALUES ({', '.join(vals)});\n")
                f.write("\n")

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n")

    conn.close()
    print(f"Migración completada. Archivo generado: {path_sql_out}")

if __name__ == "__main__":
    migrate()
