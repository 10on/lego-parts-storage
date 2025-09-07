#!/usr/bin/env python3

from pathlib import Path
from tsv_to_lcx_converter import TSVToLCXConverter

converter = TSVToLCXConverter()

# Test the mapping
headers = ['Item No', 'Color', 'Code']
mapping = converter.header_mappings.get('part_color_codes', {})
print("Headers:", headers)
print("Mapping:", mapping)

# Test column finding
for field, possible_names in mapping.items():
    idx = converter.find_column_index(headers, possible_names)
    print(f"{field}: {idx} ({headers[idx] if idx is not None else 'NOT FOUND'})")

# Test file parsing
print("\nTesting file parsing...")
try:
    result = converter.parse_tsv_file(Path('bricklink_data/part_color_codes.tab'), 'part_color_codes')
    print(f"Parsed {len(result)} rows")
    if result:
        print("First row:", result[0])
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
