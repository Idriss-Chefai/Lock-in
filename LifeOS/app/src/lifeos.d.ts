export {};

declare global {
  interface Window {
    lifeos: {
      exists(relPath: string): Promise<boolean>;
      readText(relPath: string): Promise<string>;
      writeTextSafe(relPath: string, content: string): Promise<void>;
      readDir(relPath: string): Promise<{ name: string; isFile: boolean }[]>;
      remove(relPath: string): Promise<void>;
      writeExport(relPath: string, content: string): Promise<string>;
      openPath(pathOrRelPath: string): Promise<void>;
      pickFile(extensions?: string[]): Promise<string | null>;
      pickImageAndCopyToAssets(destRelPath: string): Promise<string | null>;
      resolveAssetUrl(relPath: string): Promise<string>;
      readImageDataUrl(relPath: string): Promise<string>;
      minimizeWindow(): Promise<void>;
      maximizeWindow(): Promise<void>;
      restoreWindow(): Promise<void>;
      closeWindow(): Promise<void>;
      restartApp(): Promise<void>;
      applyUiState(state: { hideMenuBar?: boolean; fullscreen?: boolean; windowControlsOnHover?: boolean }): Promise<void>;
    };
  }
}
