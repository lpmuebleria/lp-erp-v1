import pandas as pd
from database import db

def seed_shipping_costs():
    conn = db()
    cur = conn.cursor()
    
    # Empty tables before re-seeding
    cur.execute("SET FOREIGN_KEY_CHECKS = 0")
    cur.execute("TRUNCATE TABLE shipping_costs")
    cur.execute("TRUNCATE TABLE shipping_zones")
    cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    
    excel_file = r'C:\Users\Lpmue\Downloads\LP_Muebleria_Maestro_5Ciudades_Colonias_CP_Zonas.xlsx'
    try:
        df = pd.read_excel(excel_file)
    except Exception as e:
        print(f"Could not read excel (ignoring seed, maybe fallback to JSON?): {e}")
        conn.close()
        return

    # Filter out empty rows based on new column structure
    df = df.dropna(subset=['Codigo Postal', 'Colonia'])
    
    success_count = 0
    duplicate_count = 0
    error_count = 0
    
    # 1. Extract Unique Zones and Insert them
    # The 'Zona.1' column holds the Zone ID/Name (e.g. 1, 2, 4). 'Costo' holds the cost.
    zones_map = {}
    for index, row in df.iterrows():
        # Fallback to older columns if needed, but prioritize 'Zona.1' and 'Costo'
        z_name = str(row.get('Zona.1', '')).strip()
        if not z_name or z_name == 'nan':
            continue
            
        raw_cost = row.get('Costo')
        try:
            z_costo = float(raw_cost) if pd.notnull(raw_cost) else 0.0
        except ValueError:
            z_costo = 0.0
        
        # Pick the max cost if there are conflicts, or just the first seen
        if z_name not in zones_map:
            zones_map[z_name] = z_costo
        else:
            if z_costo > zones_map[z_name]:
                 zones_map[z_name] = z_costo

    print(f"Discovered {len(zones_map)} Unique Zones: {zones_map}")
    for z_name, z_costo in zones_map.items():
        cur.execute("INSERT INTO shipping_zones (name, costo) VALUES (%s, %s)", (z_name, z_costo))
    
    # 2. Extract CPs and attach them to the zones
    for index, row in df.iterrows():
        cp = str(row['Codigo Postal']).replace('.0', '').strip()
        if not cp or cp == 'nan':
            continue
            
        colonia = str(row['Colonia']).strip()
        municipio = str(row.get('Municipio', '')).strip()
        zona_name = str(row.get('Zona.1', '')).strip()
        
        if not zona_name or zona_name == 'nan':
            continue
        
        try:
            cur.execute("SELECT id, colonia FROM shipping_costs WHERE cp = %s", (cp,))
            existing = cur.fetchone()
            
            if existing: # Duplicate CP, append colonia
                new_colonia = existing[1] + ", " + colonia
                cur.execute("UPDATE shipping_costs SET colonia = %s WHERE cp = %s", (new_colonia, cp))
                duplicate_count += 1
            else:
                cur.execute(
                    "INSERT INTO shipping_costs (cp, colonia, municipio, zona_name) VALUES (%s, %s, %s, %s)",
                    (cp, colonia, municipio, zona_name)
                )
                success_count += 1
                
        except Exception as e:
            print(f"Error inserting CP {cp}: {e}")
            error_count += 1
            
    conn.commit()
    conn.close()
    
    print(f"Migration completed. Zones Inserted: {len(zones_map)}, CPs Inserted: {success_count}, Updated (Appended Col): {duplicate_count}, Errors: {error_count}")

if __name__ == "__main__":
    seed_shipping_costs()
