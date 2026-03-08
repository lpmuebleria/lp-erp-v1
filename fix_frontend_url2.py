import os
import glob

target_dir = r"c:\Users\Lpmue\OneDrive\Desktop\Muebleria\Programación ERP\LP_ERP_V1_MVP\frontend\src"

bad_string = "const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8000/api' : 'https://lp-erp-v1.onrender.com/api');"
good_string = "const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:8000/api` : 'https://lp-erp-v1.onrender.com/api');"

for file_path in glob.glob(os.path.join(target_dir, "**", "*.jsx"), recursive=True):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if bad_string in content:
        content = content.replace(bad_string, good_string)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file_path}")

print("Replacement complete.")
