import requests

try:
    # First set a comment
    requests.put("http://localhost:8000/api/catalog/comments", json={"comentarios": "TEST COMMENT"})
    
    # Run the PDF endpoint
    r = requests.get("http://localhost:8000/api/catalog/pdf?include_stock=false")
    print("STATUS:", r.status_code)
except Exception as e:
    print(e)
