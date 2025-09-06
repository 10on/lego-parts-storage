# Адаптеры хранения

## Интерфейс
```js
loadProject(): Promise<Project>
saveProject(Project): Promise<void>
loadContainer(id): Promise<Container>
saveContainer(Container): Promise<void>
exportAll(): Promise<Blob>
importAll(file|string): Promise<void>
```

## Реализации
- LocalStorageAdapter — для MVP.
- IdbAdapter — для больших объёмов.
- FirebaseAdapter — позже, для синхронизации/шеринга.
