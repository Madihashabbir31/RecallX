const database = new Promise<IDBDatabase>((resolve, reject) => {
  const r = indexedDB.open("recallx-private-v1", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("store");
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
export async function read<T = any>(key: string): Promise<T | undefined> {
  const db = await database;
  return new Promise((resolve, reject) => {
    const r = db.transaction("store").objectStore("store").get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function write(key: string, value: any) {
  const db = await database;
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("store", "readwrite");
    tx.objectStore("store").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function clearPrivate() {
  const db = await database;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("store", "readwrite");
    tx.objectStore("store").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function update<T>(key: string, fn: (value: T | undefined) => T) {
  const db = await database;
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("store", "readwrite");
    const store = tx.objectStore("store");
    const r = store.get(key);
    r.onsuccess = () => store.put(fn(r.result), key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
