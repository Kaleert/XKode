import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, requireNativeComponent, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeService from '../services/NativeService';

// Подключаем нативный компонент
const NativeTerminalView = requireNativeComponent('NativeTerminalView');

export default function Terminal({ onClose, onMinimize }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [profiles, setProfiles] = useState([]);

  // Load Profiles
  const loadProfiles = () => {
      AsyncStorage.getItem('SERVER_PROFILES').then(j => {
          const list = j ? JSON.parse(j).filter(p => p.protocol === 'ssh') : [];
          setProfiles(list);
          setShowSelector(true);
      });
  };

  const startSession = (profile) => {
      setShowSelector(false);
      const newId = Date.now().toString();
      // Добавляем сессию в UI
      setSessions(prev => [...prev, { ...profile, sessionId: newId, title: profile.name }]);
      setActiveSessionId(newId);
      
      // Запускаем процесс в Java
      setTimeout(() => {
          NativeService.startSshSession(newId, profile.host, parseInt(profile.port), profile.user, profile.password);
      }, 100);
  };

  const closeSession = (id) => {
      NativeService.closeSession(id);
      setSessions(prev => {
          const f = prev.filter(s => s.sessionId !== id);
          if (activeSessionId === id) setActiveSessionId(f.length ? f[f.length-1].sessionId : null);
          return f;
      });
  };

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'android' ? 'padding' : 'height'} 
        style={styles.container}
        // Важно: отступ от клавиатуры, чтобы кнопки не перекрывались
        keyboardVerticalOffset={0} 
    >
      <View style={styles.header}>
          <View style={{flex:1, flexDirection:'row', alignItems:'center'}}>
              {sessions.map(s => (
                  <TouchableOpacity 
                    key={s.sessionId} 
                    style={[styles.tab, activeSessionId === s.sessionId && styles.activeTab]}
                    onPress={() => setActiveSessionId(s.sessionId)}
                  >
                      <Text style={{color: activeSessionId===s.sessionId?'#fff':'#888'}}>{s.title}</Text>
                      <TouchableOpacity onPress={() => closeSession(s.sessionId)}>
                          <MaterialCommunityIcons name="close" size={14} color="#888" style={{marginLeft:8}}/>
                      </TouchableOpacity>
                  </TouchableOpacity>
              ))}
          </View>
          <View style={{flexDirection:'row'}}>
              <TouchableOpacity style={styles.iconBtn} onPress={loadProfiles}><MaterialCommunityIcons name="plus" size={20} color="#ccc"/></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onMinimize}><MaterialCommunityIcons name="minus" size={20} color="#ccc"/></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onClose}><MaterialCommunityIcons name="close" size={20} color="#f44"/></TouchableOpacity>
          </View>
      </View>

      <View style={{flex: 1, backgroundColor: '#1e1e1e'}}>
          {sessions.length === 0 && (
              <View style={styles.empty}>
                  <Text style={{color:'#666'}}>No active sessions</Text>
                  <TouchableOpacity style={styles.btn} onPress={loadProfiles}><Text style={{color:'white'}}>Connect</Text></TouchableOpacity>
              </View>
          )}
          
          {sessions.map(s => (
              <View key={s.sessionId} style={[styles.termWrapper, {display: activeSessionId === s.sessionId ? 'flex' : 'none'}]}>
                  {/* НАШ НАТИВНЫЙ КОМПОНЕНТ */}
                  <NativeTerminalView 
                      style={{flex: 1}} 
                      sessionId={s.sessionId} 
                  />
              </View>
          ))}
      </View>

      <Modal visible={showSelector} transparent animationType="fade" onRequestClose={()=>setShowSelector(false)}>
          <View style={styles.modalBg}>
              <View style={styles.modal}>
                  <Text style={styles.modalTitle}>Select Profile</Text>
                  {profiles.map(p => (
                      <TouchableOpacity key={p.id} style={styles.profileItem} onPress={() => startSession(p)}>
                          <MaterialCommunityIcons name="console" size={20} color="#007acc"/>
                          <Text style={{color:'white', marginLeft:10}}>{p.name}</Text>
                      </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={()=>setShowSelector(false)} style={{marginTop:15}}><Text style={{color:'#ccc'}}>Cancel</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: { height: 40, flexDirection: 'row', backgroundColor: '#252526', borderBottomWidth: 1, borderBottomColor: '#333', justifyContent:'space-between' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: '100%', borderRightWidth: 1, borderRightColor: '#333' },
  activeTab: { backgroundColor: '#1e1e1e', borderTopWidth: 2, borderTopColor: '#007acc' },
  iconBtn: { padding: 10 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btn: { marginTop: 10, backgroundColor: '#007acc', padding: 10, borderRadius: 5 },
  termWrapper: { flex: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: 300, backgroundColor: '#333', padding: 20, borderRadius: 10 },
  modalTitle: { color: 'white', fontWeight: 'bold', marginBottom: 10 },
  profileItem: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#444', alignItems:'center' }
});