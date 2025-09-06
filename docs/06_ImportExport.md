# Импорт и экспорт

## MVP
- Экспорт/импорт всего проекта как JSON (project + containers + catalog).

## Позже
- BrickLink CSV/XML (wishlist, inventory).
- Rebrickable CSV.
- Слои импорта реализованы как ImportAdapter.

## Экспорт в CSV
slots.csv:
```
containerId,cellPath,partRef,colorId,qty,notes
```
