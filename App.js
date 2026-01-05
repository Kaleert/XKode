/* App.js */
import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, View, Text, StatusBar, TouchableOpacity, 
  Modal, PanResponder, Keyboard, Platform, 
  LayoutAnimation, UIManager, Animated, AppState, BackHandler
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Services
import NativeService from './src/services/NativeService';
import Logger from './src/services/Logger';

// Components
import CustomSplash from './src/components/CustomSplash';
import FileTree from './src/components/FileTree';
import Editor from './src/components/Editor';
import Terminal from './src/components/Terminal';
import AccessoryBar from './src/components/AccessoryBar';
import Tabs from './src/components/Tabs';
import Welcome from './src/components/Welcome';
import ConnectionManager from './src/components/ConnectionManager';
import Toast from './src/components/Toast';
import MainMenu from './src/components/MainMenu';
import LogViewer from './src/components/LogViewer';
import { isBinaryFile } from './src/utils/fileHelpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CACHE_KEY = 'XKODE_CACHE';

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasPermission, setHasPermission] = useState(false); // Состояние прав
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isTerminalVisible, setTerminalVisible] = useState(false);
  const [termHeight, setTermHeight] = useState(300);
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [toast, setToast] = useState(null);

  const editorRef = useRef(null);
  const terminalRef = useRef(null);

  // --- PERMISSION CHECK ---
  const checkPerms = async () => {
      try {
          const granted = await NativeService.checkPermission();
          setHasPermission(granted);
          if (granted) Logger.init(); // Инициализируем логгер только если есть права
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
      checkPerms();
      // Слушаем возвращение в приложение (если юзер сходил в настройки и вернулся)
      const sub = AppState.addEventListener('change', nextState => {
          if (nextState === 'active') checkPerms();
      });
      return () => sub.remove();
  }, []);

  // --- INIT REST ---
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    AsyncStorage.getItem(CACHE_KEY).then(json => {
        if (json) {
            const data = JSON.parse(json);
            setOpenFiles(data.files || []);
            setActiveFileId(data.activeId);
        }
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
      if(hasPermission) AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ files: openFiles, activeId: activeFileId })).catch(()=>{});
  }, [openFiles, activeFileId, hasPermission]);

  const showToastMsg = (message, type='info') => {
      setToast({ message, type, id: Date.now() });
      if (type === 'error') Logger.error('App', message);
      else Logger.info('App', message);
  };

  // --- LOGIC ---
  const fabPan = useRef(new Animated.ValueXY()).current;
  const isDraggingFab = useRef(false);
  const fabResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDraggingFab.current = false;
        fabPan.setOffset({ x: fabPan.x._value, y: fabPan.y._value });
        fabPan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, g) => {
        if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) {
            isDraggingFab.current = true;
            Animated.event([null, { dx: fabPan.x, dy: fabPan.y }], { useNativeDriver: false })(evt, g);
        }
      },
      onPanResponderRelease: (e, g) => {
        fabPan.flattenOffset();
        if (!isDraggingFab.current && Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setTerminalVisible(true);
        }
      }
    })
  ).current;

  const termPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        let h = termHeight - g.dy;
        if(h < 150) h = 150;
        if(h > 600) h = 600;
        setTermHeight(h);
      }
    })
  ).current;

  const getUniqueId = (file) => `${file.storageType}::${file.path}`;

  const handleOpenFile = async (fileObj) => {
      const uid = getUniqueId(fileObj);
      
      // 1. Проверка расширения (быстрая)
      if (isBinaryFile(fileObj.name)) {
          showToastMsg(`Cannot open binary file: ${fileObj.name}`, "error");
          return;
      }

      // 2. Если уже открыт - фокус
      if (openFiles.find(f => getUniqueId(f) === uid)) {
          setActiveFileId(uid);
          setSidebarOpen(false);
          return;
      }

      showToastMsg(`Downloading ${fileObj.name}...`, "info");

      try {
          let content = "";
          
          if (fileObj.storageType === 'local') {
              // Локальное чтение
              content = await NativeService.readLocal(fileObj.path);
          } else if (fileObj.storageType === 'sftp') {
              // SFTP чтение (Теперь реализовано!)
              // fileObj.storageConfig содержит host, user, password и т.д.
              content = await NativeService.readSftp(fileObj.storageConfig, fileObj.path);
          } else {
              throw new Error("Unknown storage protocol");
          }

          // 3. Успех
          const newFile = { 
              ...fileObj, 
              content: content, 
              isDirty: false 
          };

          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpenFiles(prev => [...prev, newFile]);
          setActiveFileId(uid);
          setSidebarOpen(false);
          showToastMsg("File opened", "success");

      } catch (e) {
          // Вывод ошибок из Java
          const msg = e.message || String(e);
          console.error("Open Error:", msg);
          showToastMsg(msg, "error");
      }
  };

  const handleCloseFile = (uid) => {
      const newFiles = openFiles.filter(f => getUniqueId(f) !== uid);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOpenFiles(newFiles);
      if (activeFileId === uid) setActiveFileId(newFiles.length > 0 ? getUniqueId(newFiles[newFiles.length-1]) : null);
  };

  const saveCurrentFile = async (content) => {
      const file = openFiles.find(f => getUniqueId(f) === activeFileId);
      if (!file) return;
      setOpenFiles(prev => prev.map(f => getUniqueId(f) === activeFileId ? { ...f, content, isDirty: false } : f));
      try {
          if (file.storageType === 'local') {
              await NativeService.saveLocal(file.path, content);
              showToastMsg(`Saved ${file.name}`, "success");
          } else { showToastMsg("Remote save not implemented", "warn"); }
      } catch (e) { showToastMsg(e.message, "error"); }
  };

  const handleAccessoryPress = (key, mods) => {
      if (isTerminalVisible && terminalRef.current) terminalRef.current.handleInput(key, mods);
      else if (editorRef.current) {
          if (key === 'TAB') editorRef.current.injectJavaScript(`window.insertText("\t")`);
          else if (key === 'SAVE') editorRef.current.injectJavaScript(`window.requestSave()`);
          else if (key.length === 1) {
              const text = mods.shift ? key.toUpperCase() : key;
              editorRef.current.injectJavaScript(`window.insertText("${text}")`);
          }
      }
  };

  const onMenuSelect = (action) => {
      setShowMenu(false);
      switch(action) {
          case 'save': editorRef.current?.injectJavaScript('window.requestSave()'); break;
          case 'terminal': setTerminalVisible(true); break;
          case 'connections': setShowConnectionManager(true); break;
          case 'logs': setShowLogs(true); break;
      }
  };

  const activeFileObj = openFiles.find(f => getUniqueId(f) === activeFileId);
  const sidebarX = useRef(new Animated.Value(-280)).current;
  useEffect(() => {
      Animated.timing(sidebarX, { toValue: isSidebarOpen ? 0 : -280, duration: 250, useNativeDriver: true }).start();
  }, [isSidebarOpen]);

  // --- RENDER ---
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
        
        {/* --- CUSTOM SPLASH SCREEN --- */}
        {!appIsReady && (
            <CustomSplash onFinish={() => setAppIsReady(true)} />
        )}
        
        {/* PERMISSION BLOCKER */}
        {!hasPermission && (
            <Modal visible={true} transparent={false} animationType="fade">
                <View style={styles.permContainer}>
                    <MaterialCommunityIcons name="folder-lock" size={80} color="#f44" />
                    <Text style={styles.permTitle}>Storage Permission Required</Text>
                    <Text style={styles.permDesc}>
                        XKode needs access to "All Files" to manage your projects and create the .xkode configuration folder.
                    </Text>
                    <TouchableOpacity style={styles.permBtn} onPress={() => NativeService.requestPermission()}>
                        <Text style={styles.permBtnText}>GRANT ACCESS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.permBtn, {backgroundColor: '#333'}]} onPress={() => BackHandler.exitApp()}>
                        <Text style={[styles.permBtnText, {color:'#ccc'}]}>EXIT</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        )}

        {/* MAIN APP CONTENT (Only if permitted) */}
        {hasPermission && (
            <>
                {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSidebarOpen(!isSidebarOpen)} style={styles.iconBtn}>
                        <MaterialCommunityIcons name={isSidebarOpen ? "close" : "menu"} size={26} color="#007acc" />
                    </TouchableOpacity>
                    <View style={{flex: 1, marginLeft: 10}}>
                        <Text style={styles.appName} numberOfLines={1}>
                            {activeFileObj ? activeFileObj.name : 'XKode'} {activeFileObj?.isDirty ? '●' : ''}
                        </Text>
                        {activeFileObj && <Text style={styles.pathText} numberOfLines={1}>{activeFileObj.path}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.iconBtn}>
                        <MaterialCommunityIcons name="dots-vertical" size={24} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <View style={styles.workspace}>
                    <View style={{flex: 1}}>
                        {openFiles.length > 0 && (
                            <Tabs 
                                files={openFiles.map(f => ({...f, id: getUniqueId(f)}))} 
                                activeFile={activeFileId} 
                                onTabClick={setActiveFileId} 
                                onCloseTab={handleCloseFile} 
                            />
                        )}
                        <View style={{flex: 1}}>
                            {activeFileObj ? (
                                <Editor ref={editorRef} initialCode={activeFileObj.content} path={activeFileObj.path} onSave={saveCurrentFile} />
                            ) : <Welcome onOpenFile={() => setSidebarOpen(true)} />}
                        </View>
                        <View style={{height: isTerminalVisible ? 0 : 0}} />
                    </View>

                    <Animated.View style={[styles.sidebarOverlay, { transform: [{ translateX: sidebarX }] }]}>
                        <FileTree 
                            onSelectFile={handleOpenFile} 
                            onAddSftp={() => { setSidebarOpen(false); setShowConnectionManager(true); }}
                            onError={(msg) => showToastMsg(msg, 'error')}
                        />
                        <TouchableOpacity style={styles.shadowStrip} onPress={() => setSidebarOpen(false)} />
                    </Animated.View>

                    <View style={[styles.keyboardLayer, { bottom: keyboardHeight }]}>
                        <View style={[styles.terminalWrapper, { height: termHeight, display: isTerminalVisible ? 'flex' : 'none' }]}>
                             <View style={styles.resizeHandle} {...termPan.panHandlers}><View style={styles.resizeBar} /></View>
                             <Terminal 
                                ref={terminalRef} 
                                onClose={() => setTerminalVisible(false)}
                                onMinimize={() => setTerminalVisible(false)}
                                onError={(m) => showToastMsg(m, 'error')}
                             />
                        </View>
                        <AccessoryBar onPress={handleAccessoryPress} />
                    </View>
                </View>

                {!isTerminalVisible && (
                    <Animated.View style={[styles.fab, { transform: fabPan.getTranslateTransform() }]} {...fabResponder.panHandlers}>
                        <MaterialCommunityIcons name="console-line" size={24} color="white" />
                    </Animated.View>
                )}

                <Modal visible={showConnectionManager} animationType="slide" onRequestClose={() => setShowConnectionManager(false)}>
                    <SafeAreaView style={{flex:1, backgroundColor:'#1e1e1e'}}>
                        <ConnectionManager onClose={() => setShowConnectionManager(false)} onToast={showToastMsg} />
                    </SafeAreaView>
                </Modal>

                <LogViewer visible={showLogs} onClose={() => setShowLogs(false)} onToast={showToastMsg} />
                {showMenu && <MainMenu onClose={() => setShowMenu(false)} onSelect={onMenuSelect} />}
            </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: { height: 50, backgroundColor: '#252526', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, elevation: 4, zIndex: 50, borderBottomWidth: 1, borderBottomColor: '#333' },
  appName: { color: '#ccc', fontWeight: 'bold', fontSize: 16 },
  pathText: { color: '#666', fontSize: 10 },
  iconBtn: { padding: 10 },
  workspace: { flex: 1, backgroundColor: '#1e1e1e', position: 'relative' },
  sidebarOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 280, flexDirection: 'row', backgroundColor: '#252526', zIndex: 100, elevation: 20 },
  shadowStrip: { width: 40, height:'100%' }, 
  keyboardLayer: { position: 'absolute', left: 0, right: 0, zIndex: 60, backgroundColor: '#1e1e1e' },
  terminalWrapper: { borderTopWidth: 1, borderTopColor: '#007acc', backgroundColor: '#1e1e1e', overflow: 'hidden' },
  resizeHandle: { height: 20, backgroundColor: '#252526', justifyContent: 'center', alignItems: 'center' },
  resizeBar: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2 },
  fab: { 
      position: 'absolute', right: 20, bottom: 100, 
      width: 56, height: 56, borderRadius: 28, 
      backgroundColor: '#007acc', 
      justifyContent: 'center', alignItems: 'center', 
      elevation: 6, zIndex: 200, 
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5
  },
  // PERMISSION STYLES
  permContainer: { flex: 1, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', padding: 30 },
  permTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  permDesc: { color: '#aaa', textAlign: 'center', marginBottom: 40, fontSize: 16, lineHeight: 24 },
  permBtn: { backgroundColor: '#007acc', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8, marginBottom: 15, width: '100%', alignItems: 'center' },
  permBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});