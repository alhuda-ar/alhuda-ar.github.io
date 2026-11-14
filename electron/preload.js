// الهدى — الجسر الآمن بين صفحة الموقع وتطبيق الويندوز
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('alhudaDesktop', {
  isDesktop: true,
  openExternal: (url) => ipcRenderer.invoke('alhuda:open-external', String(url)),
  focus: () => ipcRenderer.invoke('alhuda:focus'),
});
