import pandas as pd
from pathlib import Path

IN_XLSX = Path(r"C:\Users\DARLAN\.openclaw\media\inbound\8c7cecd9-bc1d-4dc9-8925-e58a7cece5d4.xlsx")
OUT_CSV = Path(__file__).resolve().parent / "data_trafico_total.csv"

MONTHS = {
    'enero': 1,
    'febrero': 2,
    'marzo': 3,
    'abril': 4,
    'mayo': 5,
    'junio': 6,
    'julio': 7,
    'agosto': 8,
    'septiembre': 9,
    'setiembre': 9,
    'octubre': 10,
    'noviembre': 11,
    'diciembre': 12,
}

def norm(s):
    if pd.isna(s):
        return None
    return str(s).strip()


df = pd.read_excel(IN_XLSX, sheet_name='Data')

# Find columns robustly (encoding artifacts)
col_station = [c for c in df.columns if 'Peaje' in str(c)][0]
col_year = [c for c in df.columns if str(c).startswith('A') and len(str(c))<=3][0]
col_month = [c for c in df.columns if 'Mes' in str(c)][0]
col_code = [c for c in df.columns if 'C' in str(c) and 'Estaci' in str(c)][0]
col_dept = [c for c in df.columns if 'Departamento' in str(c)][0]
col_total = [c for c in df.columns if 'Total' in str(c) and 'Tr' in str(c)][0]

out = pd.DataFrame({
    'estacion': df[col_station].astype(str).str.strip(),
    'anio': pd.to_numeric(df[col_year], errors='coerce').astype('Int64'),
    'mes': df[col_month].astype(str).str.strip(),
    'codigo_estacion': df[col_code].astype(str).str.strip(),
    'departamento': df[col_dept].astype(str).str.strip(),
    'trafico_total': pd.to_numeric(df[col_total], errors='coerce')
})

out['mes_num'] = out['mes'].str.lower().map(MONTHS)

# If month was numeric string like '1', coerce
out.loc[out['mes_num'].isna(), 'mes_num'] = pd.to_numeric(out.loc[out['mes_num'].isna(), 'mes'], errors='coerce')

out = out.drop(columns=['mes']).rename(columns={'mes_num':'mes'})

# Drop rows without year
out = out[out['anio'].notna()].copy()

# Fill missing trafico_total with 0
out['trafico_total'] = out['trafico_total'].fillna(0)

# Cast mes to Int64
out['mes'] = pd.to_numeric(out['mes'], errors='coerce').astype('Int64')

# Keep expected column order
out = out[['estacion','anio','mes','codigo_estacion','departamento','trafico_total']]

OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
out.to_csv(OUT_CSV, index=False, encoding='utf-8')

print('Wrote', OUT_CSV, 'rows', len(out))
print('Mes nulls', int(out['mes'].isna().sum()))
