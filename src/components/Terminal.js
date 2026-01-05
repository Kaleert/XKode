/* src/components/Terminal.js */
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import WebView from 'react-native-webview'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeService from '../services/NativeService';

const Terminal = forwardRef(({ onClose, onMinimize, onError }, ref) => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState([]);

  // Ref для скрытого инпута
  const inputRef = useRef(null);
  const webViews = useRef({});

  // Получаем данные от Java
  useEffect(() => {
      const sub = NativeService.onTerminalOutput(({ sessionId, data }) => {
          const safeData = JSON.stringify(data);
          webViews.current[sessionId]?.injectJavaScript(`window.term.write(${safeData});`);
      });
      return () => sub.remove();
  }, []);

  useImperativeHandle(ref, () => ({
    handleInput: (key, mods) => {
        if (!activeSessionId) return;
        let char = key;
        const { ctrl } = mods;
        if (ctrl) {
            const code = key.charCodeAt(0);
            if (code >= 65 && code <= 90) char = String.fromCharCode(code - 64);
        } else {
            const codes = { 
                'ENTER':'\r', 'TAB':'\t', 'BACKSPACE':'\x7f', 'ESC':'\x1b', 
                'UP':'\x1b[A', 'DOWN':'\x1b[B', 'LEFT':'\x1b[D', 'RIGHT':'\x1b[C' 
            };
            if(codes[key]) char = codes[key];
        }
        NativeService.writeToSession(activeSessionId, char);
    }
  }));

  const startSession = (profile) => {
      setShowSelector(false);
      const newId = Date.now().toString();
      const title = profile.name;
      setSessions(prev => [...prev, { ...profile, sessionId: newId, title }]);
      setActiveSessionId(newId);

      setTimeout(() => {
          NativeService.startSshSession(newId, profile.host, parseInt(profile.port), profile.user, profile.password);
          setTimeout(() => inputRef.current?.focus(), 500);
      }, 300);
  };

  const closeSession = (id) => {
      NativeService.closeSession(id);
      setSessions(prev => {
          const f = prev.filter(s => s.sessionId !== id);
          if (activeSessionId === id) setActiveSessionId(f.length ? f[f.length-1].sessionId : null);
          return f;
      });
  };

  const loadProfiles = () => {
      AsyncStorage.getItem('SERVER_PROFILES').then(j => {
          const list = j ? JSON.parse(j).filter(p => p.protocol === 'ssh') : [];
          setAvailableProfiles(list);
          setShowSelector(true);
      });
  };

  const renameSession = () => {
      if(!renamingId) return;
      setSessions(prev => prev.map(s => s.sessionId === renamingId ? {...s, title: newName} : s));
      setRenamingId(null);
  };

  // --- HTML TERMINAL (xterm.js) ---
  const getHtml = () => `
    <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>body{margin:0;background:#1e1e1e;overflow:hidden}#terminal{width:100vw;height:100vh}</style>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
    </head><body><div id="terminal"></div>
    <script>
        var term = new Terminal({
            fontFamily:'monospace',fontSize:13,cursorBlink:true,
            theme:{background:'#1e1e1e'},
            rendererType:'canvas'
        });
        var fit = new FitAddon.FitAddon(); term.loadAddon(fit); term.open(document.getElementById('terminal')); fit.fit();
        window.term = term;
        window.addEventListener('resize', () => fit.fit());
        document.body.onclick = () => window.ReactNativeWebView.postMessage('FOCUS');
    </script></body></html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex: 1}}>
              {sessions.map(s => (
                  <TouchableOpacity 
                    key={s.sessionId} 
                    style={[styles.tab, activeSessionId === s.sessionId && styles.activeTab]}
                    onPress={() => setActiveSessionId(s.sessionId)}
                    onLongPress={() => { setRenamingId(s.sessionId); setNewName(s.title); }}
                  >
                      <Text style={[styles.tabText, activeSessionId === s.sessionId && {color:'white'}]}>{s.title}</Text>
                      <TouchableOpacity onPress={() => closeSession(s.sessionId)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                          <MaterialCommunityIcons name="close" size={14} color="#888" style={{marginLeft: 8}}/>
                      </TouchableOpacity>
                  </TouchableOpacity>
              ))}
          </ScrollView>
          <View style={styles.controls}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={loadProfiles}>
                  <MaterialCommunityIcons name="plus" size={20} color="#ccc"/>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={onMinimize}>
                  <MaterialCommunityIcons name="minus" size={20} color="#ccc"/>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={onClose}>
                  <MaterialCommunityIcons name="close" size={20} color="#f44"/>
              </TouchableOpacity>
          </View>
      </View>

      <View style={{flex: 1}}>
          {sessions.length === 0 && (
              <View style={styles.empty}>
                  <Text style={{color:'#666', marginBottom: 10}}>No active sessions</Text>
                  <TouchableOpacity style={styles.createBtn} onPress={loadProfiles}>
                      <Text style={{color:'white'}}>Connect via SSH</Text>
                  </TouchableOpacity>
              </View>
          )}
          {sessions.map(s => (
              <View key={s.sessionId} style={[styles.termView, {display: activeSessionId === s.sessionId ? 'flex' : 'none'}]}>
                  <WebView
                    ref={r => webViews.current[s.sessionId] = r}
                    source={{ html: getHtml() }}
                    style={{backgroundColor: '#1e1e1e'}}
                    onMessage={() => inputRef.current?.focus()}
                    javaScriptEnabled
                    androidLayerType="hardware"
                  />
              </View>
          ))}
      </View>

      {/* --- MAGIC INPUT --- */}
      <TextInput
          ref={inputRef}
          style={{ position: 'absolute', width: 1, height: 1, bottom: -100, opacity: 0 }}
          // ВАЖНО ДЛЯ ENTER и КУРСОРА:
          autoCorrect={false}
          autoComplete="off"
          autoCapitalize="none"
          keyboardType="default" 
          returnKeyType="none" // <--- Это превращает галочку в стрелку Enter
          enablesReturnKeyAutomatically={false}
          caretHidden={true}
          value="" // Всегда пустой, мы не храним state
          
          onKeyPress={(e) => {
              if (!activeSessionId) return;
              const key = e.nativeEvent.key;
              if (key === 'Backspace') NativeService.writeToSession(activeSessionId, '\x7f');
              else if (key === 'Enter') NativeService.writeToSession(activeSessionId, '\r');
          }}
          onChangeText={(text) => {
              if (!activeSessionId || !text) return;
              NativeService.writeToSession(activeSessionId, text);
          }}
      />

      <Modal visible={showSelector} transparent animationType="fade" onRequestClose={()=>setShowSelector(false)}>
          <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={()=>setShowSelector(false)}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>SSH Connections</Text>
                  {availableProfiles.length === 0 ? (
                      <Text style={{color:'#777', padding:20, textAlign:'center'}}>Add SSH connection in Manager first.</Text>
                  ) : (
                      availableProfiles.map(p => (
                          <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => startSession(p)}>
                              <MaterialCommunityIcons name="server" size={20} color="#007acc"/>
                              <Text style={{color:'white', marginLeft:15, fontSize:16}}>{p.name}</Text>
                          </TouchableOpacity>
                      ))
                  )}
              </View>
          </TouchableOpacity>
      </Modal>

      <Modal visible={!!renamingId} transparent animationType="fade">
          <View style={styles.modalBg}>
              <View style={[styles.modalContent, {width: 300}]}>
                  <Text style={styles.modalTitle}>Rename Tab</Text>
                  <TextInput style={styles.renameInput} value={newName} onChangeText={setNewName} autoFocus />
                  <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop: 15}}>
                      <TouchableOpacity onPress={() => setRenamingId(null)} style={{marginRight: 20}}><Text style={{color:'#ccc'}}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity onPress={renameSession}><Text style={{color:'#007acc', fontWeight:'bold'}}>Rename</Text></TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: { height: 45, flexDirection: 'row', backgroundColor: '#252526', borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: '#333', minWidth: 100 },
  activeTab: { backgroundColor: '#1e1e1e', borderTopWidth: 2, borderTopColor: '#007acc' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#333', marginLeft: 'auto' },
  ctrlBtn: { padding: 12 },
  termView: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  createBtn: { marginTop: 15, backgroundColor: '#007acc', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#333', borderRadius: 8, padding: 15, elevation: 10 },
  modalTitle: { color: 'white', fontWeight: 'bold', marginBottom: 10 },
  modalItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#444', alignItems: 'center' },
  renameInput: { backgroundColor: '#222', color: 'white', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: '#007acc' }
});

export default Terminal;