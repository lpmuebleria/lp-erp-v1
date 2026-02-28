import codecs

with codecs.open("frontend/src/components/Sales.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

clean_lines = lines[:627]
clean_lines.append("\nexport default Sales;\n")

with codecs.open("frontend/src/components/Sales.jsx", "w", encoding="utf-8") as f:
    f.writelines(clean_lines)

print("Trimmed file to correct length.")
