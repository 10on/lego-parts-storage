#!/usr/bin/env python3

def find_column_index(headers, possible_names):
    """Находит индекс колонки по возможным названиям"""
    for i, header in enumerate(headers):
        for name in possible_names:
            if header.lower() == name.lower():
                return i
    return None

# Test the mapping
headers = ['Item No', 'Color', 'Code']
mapping = {
    'partId': ['Number', 'Item No', 'ItemNo', 'Part No', 'Part Number'],
    'colorId': ['Color ID', 'ColorID', 'Color Code', 'Color']
}

print("Headers:", headers)
print("Mapping:", mapping)

for field, possible_names in mapping.items():
    idx = find_column_index(headers, possible_names)
    print(f"{field}: {idx} ({headers[idx] if idx is not None else 'NOT FOUND'})")
