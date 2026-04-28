# WebCapturer

一个本地运行的 `Node.js + TypeScript` 多摄像头录制应用（Electron）。

## 功能

- 同时调用 1-3 个摄像头。
- 实时预览每个摄像头画面。
- 同步录制每路画面。
- 停止后分别保存为本地 `.webm` 文件。
- 构建脚本使用 Node 内置文件操作，兼容 Windows / macOS / Linux。

## 使用

```bash
npm install
npm run start
```

> 首次启动请允许系统摄像头权限。

## 说明

- 保存目录默认建议在系统视频目录下的 `WebCapturer/YYYY-MM-DD`。
- 每一路摄像头停止后会弹出保存窗口，可逐个确认文件名与位置。
