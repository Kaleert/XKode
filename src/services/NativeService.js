import { NativeModules, DeviceEventEmitter } from 'react-native';
const { XKodeNative } = NativeModules;

export default {
    listLocal: (path) => XKodeNative.listLocalFiles(path),
    readLocal: (path) => XKodeNative.readLocalFile(path),
    saveLocal: (path, content) => XKodeNative.saveLocalFile(path, content),
    
    // New methods for Logger
    createDir: (path) => XKodeNative.createDir(path),
    appendFile: (path, content) => XKodeNative.appendFile(path, content),
    zipFolder: (src, dest) => XKodeNative.zipFolder(src, dest),
    
    readSftp: (config, path) => XKodeNative.readSftpFile(config.host, parseInt(config.port), config.user, config.password, path),
    listSftp: (cfg, path) => XKodeNative.listSftpFiles(cfg.host, parseInt(cfg.port), cfg.user, cfg.password, path),
    listFtp: (cfg, path) => XKodeNative.listFtpFiles(cfg.host, parseInt(cfg.port), cfg.user, cfg.password, path),

    startSshSession: (id, host, port, user, pass) => XKodeNative.startSshSession(id, host, port, user, pass),
    startLocalSession: (id) => XKodeNative.startLocalSession(id),
    writeToSession: (id, data) => XKodeNative.writeToSession(id, data),
    closeSession: (id) => XKodeNative.closeSession(id),

    onTerminalOutput: (cb) => DeviceEventEmitter.addListener('TERMINAL_OUTPUT', cb),
    
    checkPermission: () => XKodeNative.checkPermission(),
    requestPermission: () => XKodeNative.requestPermission(),
};