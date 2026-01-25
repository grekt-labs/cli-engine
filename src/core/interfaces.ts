/**
 * Core interfaces for dependency injection.
 * These abstract away I/O operations for testability and portability.
 */

export interface FileSystem {
  readFile(path: string): string;
  readFileBinary(path: string): Buffer;
  writeFile(path: string, content: string): void;
  writeFileBinary(path: string, content: Buffer): void;
  exists(path: string): boolean;
  mkdir(path: string, options?: { recursive?: boolean }): void;
  readdir(path: string): string[];
  stat(path: string): { isDirectory: boolean; isFile: boolean; size: number };
  unlink(path: string): void;
  rmdir(path: string, options?: { recursive?: boolean }): void;
  copyFile(src: string, dest: string): void;
  rename(src: string, dest: string): void;
}

export interface HttpClient {
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

export interface ShellExecutor {
  exec(command: string): string;
}

export interface TokenProvider {
  getRegistryToken(scope: string): string | undefined;
  getGitToken(type: 'github' | 'gitlab', host?: string): string | undefined;
}

export interface PathConfig {
  projectRoot: string;
  artifactsDir: string;
  configFile: string;
  lockFile: string;
  localConfigFile: string;
}

export interface EngineContext {
  fs: FileSystem;
  http: HttpClient;
  shell: ShellExecutor;
  tokens: TokenProvider;
  paths: PathConfig;
}
