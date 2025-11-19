
const DB_NAME = 'PromptManagerDB';
const STORE_NAME = 'handles';

// Interface for File System Access API types
declare global {
  interface FileSystemFileHandle extends FileSystemHandle {
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }
  interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>;
    close(): Promise<void>;
  }
}

export const StorageService = {
  async getHandle(): Promise<FileSystemFileHandle | undefined> {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(undefined);
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        e.target.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get('db_handle');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        } catch (err) {
          resolve(undefined);
        }
      };
      request.onerror = () => resolve(undefined);
    });
  },

  async saveHandle(handle: FileSystemFileHandle): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        e.target.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(handle, 'db_handle');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject();
      };
    });
  },

  async clearHandle(): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete('db_handle');
        tx.oncomplete = () => resolve();
      };
    });
  }
};
