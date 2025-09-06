# Модель данных

## Container
- id, name
- kind: "cabinet" | "box" | "pile"
- grid (rows, cols, cells) — кроме pile
- tags, meta

## Cell
- id, r, c, rowspan, colspan
- assignment или compartmentGrid

## Compartment
- id, r, c, assignment

## Assignment
- colorPolicy: "any" | "fixed" | "list"
- allowedColors[]
- items[]

## AssignmentItem
- partRef, colorId?, qty, notes?

## PartCatalogItem
- unifiedPartId
- rb_part_num, bl_part_num
- name, images
- colors[]

## Project
- id, name
- containers[]
- imageSourcePreference[]
- storage: { mode }
- duplicateKeyMode: "part-only" | "part+color"
