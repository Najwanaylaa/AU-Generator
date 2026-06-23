// Minimal global augmentations for File System Access API used in the app

export {}

declare global {
  interface Window {
    // showDirectoryPicker is an optional browser API on Window
    showDirectoryPicker?: (options?: any) => Promise<any>
  }
}
