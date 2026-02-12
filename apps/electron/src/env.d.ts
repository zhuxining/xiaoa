/// <reference types="vite/client" />

declare module "*.css" {}

// Electron Forge Vite Plugin 注入的全局变量
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
