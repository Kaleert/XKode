/* src/components/FileTree.js */
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeService from '../services/NativeService';
import FileIcon from './FileIcon';

export default function FileTree({ onSelectFile, onAddSftp, onError }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentRoot, setCurrentRoot] = useState(null);
  const [currentPath, setCurrentPath] = useState('');

  // Локальное хранилище всегда первое
  const LOCAL_STORAGE = { id: 'local', name: 'Internal Storage', path: '/storage/emulated/0', protocol: 'local', type: 'root' };

  useEffect(() => { loadRoots(); }, []);

  const loadRoots = async () => {
      setLoading(true);
      setCurrentRoot(null);
      try {
          const json = await AsyncStorage.getItem('SERVER_PROFILES');
          // Показываем только SFTP/FTP в списке дисков (SSH отдельно в терминале)
          const profiles = json ? JSON.parse(json).filter(p => p.protocol !== 'ssh') : [];
          setNodes([LOCAL_STORAGE, ...profiles.map(p => ({...p, type: 'root'}))]);
      } catch(e) { onError(e.message); }
      finally { setLoading(false); }
  };

  const browse = async (root, path) => {
      setLoading(true);
      try {
          let items = [];
          if (root.protocol === 'local') items = await NativeService.listLocal(path);
          else if (root.protocol === 'sftp') items = await NativeService.listSftp(root, path);
          else if (root.protocol === 'ftp') items = await NativeService.listFtp(root, path);
          
          setCurrentRoot(root);
          setCurrentPath(path);
          // Сортировка: папки сверху, по алфавиту
          setNodes(items.sort((a,b) => {
              if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
              return b.isDirectory - a.isDirectory;
          }));
      } catch (e) { 
          onError(`Access Denied: ${e.message}`); 
          // Если не смогли открыть папку, не выкидываем в корень, остаемся где были (или в корень, если это старт)
          if(path === '/' || path === '' || path === root.path) loadRoots();
      } finally { setLoading(false); }
  };

  const renderItem = ({item}) => {
      // 1. Root Item (Список дисков)
      if (!currentRoot) {
          return (
              <TouchableOpacity style={styles.rootItem} onPress={() => browse(item, item.path || '/')}>
                  <MaterialCommunityIcons name={item.protocol === 'local' ? 'cellphone' : 'server-network'} size={24} color={item.protocol==='local'?'#dcb67a':'#007acc'} />
                  <View style={{marginLeft: 10, flex: 1}}>
                      <Text style={styles.textMain} numberOfLines={1}>{item.name}</Text>
                      {item.protocol !== 'local' && <Text style={styles.textSub}>{item.user}@{item.host}</Text>}
                  </View>
              </TouchableOpacity>
          );
      }

      // 2. File/Folder Item
      return (
          <TouchableOpacity 
            style={styles.fileItem} 
            onPress={() => item.isDirectory ? browse(currentRoot, item.path) : onSelectFile({...item, storageType: currentRoot.protocol, storageConfig: currentRoot})}
          >
              {item.isDirectory ? (
                  <MaterialCommunityIcons name="folder" size={22} color="#dcb67a" style={{marginRight: 10}} />
              ) : (
                  <FileIcon name={item.name} isDirectory={false} style={{marginRight: 10}} />
              )}
              {/* flex: 1 позволяет тексту занимать всё место и переноситься */}
              <Text style={styles.textMain}>{item.name}</Text>
          </TouchableOpacity>
      );
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>EXPLORER</Text>
            <View style={{flexDirection:'row'}}>
                <TouchableOpacity onPress={loadRoots} style={{marginRight: 15}}><MaterialCommunityIcons name="refresh" size={18} color="#ccc"/></TouchableOpacity>
                <TouchableOpacity onPress={onAddSftp}><MaterialCommunityIcons name="server-plus" size={18} color="#ccc"/></TouchableOpacity>
            </View>
        </View>

        {currentRoot && (
            <TouchableOpacity style={styles.backBtn} onPress={() => {
                if(currentPath === currentRoot.path || currentPath === '/' || currentPath === '') loadRoots();
                else {
                    const arr = currentPath.split('/'); 
                    arr.pop(); 
                    // Обработка корня для локального хранилища может быть /storage/emulated/0
                    const newPath = arr.join('/');
                    browse(currentRoot, newPath.length < currentRoot.path.length ? currentRoot.path : newPath);
                }
            }}>
                <MaterialCommunityIcons name="arrow-left" size={16} color="#007acc"/>
                <Text style={styles.backText} numberOfLines={1}>{currentPath === currentRoot.path ? 'Servers' : '..'}</Text>
            </TouchableOpacity>
        )}

        {loading ? <ActivityIndicator color="#007acc" style={{marginTop: 20}} /> : (
            <FlatList 
                data={nodes}
                renderItem={renderItem}
                keyExtractor={(i, idx) => idx.toString()}
                contentContainerStyle={{paddingBottom: 20}}
                showsVerticalScrollIndicator={false} // Убираем полосу прокрутки
            />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#252526' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#1e1e1e', borderBottomWidth: 1, borderBottomColor: '#333' },
    headerTitle: { color: '#bbb', fontWeight: 'bold', fontSize: 12 },
    rootItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#2b2b2b' },
    // fileItem: увеличил паддинги, убрал фикс высоту
    fileItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
    textMain: { color: '#ccc', fontSize: 14, flex: 1, flexWrap: 'wrap' }, // flexWrap разрешает перенос
    textSub: { color: '#666', fontSize: 11 },
    backBtn: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#2d2d2d', borderBottomWidth:1, borderColor:'#333' },
    backText: { color: '#fff', marginLeft: 10, fontSize: 14, fontWeight: 'bold' }
});