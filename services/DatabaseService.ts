
import { Project, Bot, Prompt } from '../types';

// We define the SQL.js type loosely as it comes from the window object
declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

export class DatabaseService {
  private db: any = null;
  private fileHandle: FileSystemFileHandle | null = null;

  async init(data?: Uint8Array): Promise<void> {
    if (!window.initSqlJs) {
      throw new Error("SQL.js not loaded");
    }

    const SQL = await window.initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    if (data) {
      this.db = new SQL.Database(data);
    } else {
      this.db = new SQL.Database();
      this.initSchema();
    }
  }

  // Set the file handle for subsequent saves
  setFileHandle(handle: FileSystemFileHandle | null) {
    this.fileHandle = handle;
  }

  hasFileHandle(): boolean {
    return !!this.fileHandle;
  }

  getFileName(): string {
    return this.fileHandle ? this.fileHandle.name : '';
  }

  export(): Uint8Array {
    if (!this.db) throw new Error("Database not initialized");
    return this.db.export();
  }

  // Save directly to disk if handle exists, otherwise return false
  async saveToDisk(): Promise<boolean> {
    if (!this.db || !this.fileHandle) return false;
    
    try {
      const data = this.db.export();
      const writable = await this.fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return true;
    } catch (e) {
      console.error("Error saving to disk:", e);
      throw e;
    }
  }

  private initSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        system_prompt TEXT,
        user_prompt TEXT,
        dev_prompt TEXT,
        params TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bot_id) REFERENCES bots(id) ON DELETE CASCADE
      );
    `;
    this.db.run(schema);
  }

  // --- Projects ---

  getProjects(): Project[] {
    const res = this.db.exec("SELECT * FROM projects ORDER BY updated_at DESC");
    if (res.length === 0) return [];
    return this.mapResults<Project>(res[0]);
  }

  getProject(id: number): Project | null {
    const res = this.db.exec("SELECT * FROM projects WHERE id = ?", [id]);
    if (res.length === 0) return null;
    const projects = this.mapResults<Project>(res[0]);
    return projects[0] || null;
  }

  createProject(name: string, description: string): void {
    const stmt = this.db.prepare("INSERT INTO projects (name, description, updated_at) VALUES (?, ?, datetime('now'))");
    stmt.run([name, description]);
    stmt.free();
  }

  updateProject(id: number, name: string, description: string): void {
    const stmt = this.db.prepare("UPDATE projects SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?");
    stmt.run([name, description, id]);
    stmt.free();
  }

  deleteProject(id: number): void {
    // Enabling foreign key support is good practice, but manual cleanup ensures consistency if not enabled
    this.db.run("DELETE FROM projects WHERE id = ?", [id]);
  }

  // --- Bots ---

  getBots(projectId: number): Bot[] {
    const res = this.db.exec("SELECT * FROM bots WHERE project_id = ? ORDER BY updated_at DESC", [projectId]);
    if (res.length === 0) return [];
    return this.mapResults<Bot>(res[0]);
  }

  getBot(id: number): Bot | null {
    const res = this.db.exec("SELECT * FROM bots WHERE id = ?", [id]);
    if (res.length === 0) return null;
    const bots = this.mapResults<Bot>(res[0]);
    return bots[0] || null;
  }

  createBot(projectId: number, name: string, description: string): void {
    const stmt = this.db.prepare("INSERT INTO bots (project_id, name, description, updated_at) VALUES (?, ?, ?, datetime('now'))");
    stmt.run([projectId, name, description]);
    stmt.free();
  }

  updateBot(id: number, name: string, description: string): void {
    const stmt = this.db.prepare("UPDATE bots SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?");
    stmt.run([name, description, id]);
    stmt.free();
  }

  deleteBot(id: number): void {
    this.db.run("DELETE FROM bots WHERE id = ?", [id]);
  }

  // --- Prompts ---

  getPrompts(botId: number): Prompt[] {
    const res = this.db.exec("SELECT * FROM prompts WHERE bot_id = ? ORDER BY updated_at DESC", [botId]);
    if (res.length === 0) return [];
    return this.mapResults<Prompt>(res[0]);
  }

  getPrompt(id: number): Prompt | null {
    const res = this.db.exec("SELECT * FROM prompts WHERE id = ?", [id]);
    if (res.length === 0) return null;
    const prompts = this.mapResults<Prompt>(res[0]);
    return prompts[0] || null;
  }

  createPrompt(botId: number, name: string): number {
    const defaultParams = JSON.stringify({ temperature: 0.7, maxOutputTokens: 1024 }, null, 2);
    const stmt = this.db.prepare(`
      INSERT INTO prompts (bot_id, name, system_prompt, user_prompt, dev_prompt, params, updated_at) 
      VALUES (?, ?, '', '', '', ?, datetime('now'))
    `);
    stmt.run([botId, name, defaultParams]);
    const id = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    stmt.free();
    return id;
  }

  updatePrompt(id: number, data: Partial<Prompt>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { updates.push("name = ?"); values.push(data.name); }
    if (data.system_prompt !== undefined) { updates.push("system_prompt = ?"); values.push(data.system_prompt); }
    if (data.user_prompt !== undefined) { updates.push("user_prompt = ?"); values.push(data.user_prompt); }
    if (data.dev_prompt !== undefined) { updates.push("dev_prompt = ?"); values.push(data.dev_prompt); }
    if (data.params !== undefined) { updates.push("params = ?"); values.push(data.params); }

    if (updates.length === 0) return;

    updates.push("updated_at = datetime('now')");
    values.push(id);

    const query = `UPDATE prompts SET ${updates.join(', ')} WHERE id = ?`;
    this.db.run(query, values);
  }

  deletePrompt(id: number): void {
    this.db.run("DELETE FROM prompts WHERE id = ?", [id]);
  }

  duplicatePrompt(id: number): void {
    const prompt = this.getPrompt(id);
    if (!prompt) return;
    
    const stmt = this.db.prepare(`
      INSERT INTO prompts (bot_id, name, system_prompt, user_prompt, dev_prompt, params, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run([
      prompt.bot_id, 
      `${prompt.name} (Copy)`, 
      prompt.system_prompt, 
      prompt.user_prompt, 
      prompt.dev_prompt, 
      prompt.params
    ]);
    stmt.free();
  }

  // Helper to map SQL.js results to objects
  private mapResults<T>(result: { columns: string[], values: any[][] }): T[] {
    const { columns, values } = result;
    return values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj as T;
    });
  }
}

export const dbService = new DatabaseService();
