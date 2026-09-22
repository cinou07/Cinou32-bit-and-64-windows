
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cinouAuth", {
    signInWithGoogle: () => ipcRenderer.invoke("google-sign-in")
});

