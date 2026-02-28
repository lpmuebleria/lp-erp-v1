import pandas as pd
import json
df = pd.read_excel(r'C:\Users\Lpmue\Downloads\CP La laguna.xlsx')
# find where the actual header is 
print("Columns:", df.columns.tolist())
print(df.head(10).to_json(orient='records', force_ascii=False))
