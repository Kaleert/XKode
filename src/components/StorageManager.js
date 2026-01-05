import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

export default function StorageManager({ serverUrl, storages, onSelect, onRefresh }) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showForm, setShowForm] = useState(null); // 'sftp' | 'ftp' ...
  const [config, setConfig] = useState({ host: '', user: '', password: '', port: '22', name: '' });

  const connectSftp = async () => {
      try {
          await axios.post(`${serverUrl}/api/storages/connect-sftp`, config);
          setShowForm(null);
          onRefresh(); // Обновляем список
      } catch (e) {
          Alert.alert("Error", e.message);
      }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
        <MaterialCommunityIcons 
            name={item.type === 'local' ? 'cellphone' : 'server-network'} 
            size={24} color={item.type === 'local' ? '#dcb67a' : '#007acc'} 
        />
        <View style={{marginLeft: 15, flex: 1}}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSub}>{item.type.toUpperCase()}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
        <Text style={styles.header}>Storage Manager</Text>
        
        <FlatList 
            data={storages}
            renderItem={renderItem}
            keyExtractor={i => i.id}
            contentContainerStyle={{padding: 10}}
        />

        {/* FAB для добавления */}
        <View style={styles.fabContainer}>
            {showAddMenu && (
                <View style={styles.menu}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => setShowForm('sftp')}>
                        <MaterialCommunityIcons name="server-security" size={20} color="#fff"/>
                        <Text style={styles.menuText}>SFTP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem}>
                        <MaterialCommunityIcons name="web" size={20} color="#ccc"/>
                        <Text style={styles.menuText}>FTP (Soon)</Text>
                    </TouchableOpacity>
                </View>
            )}
            <TouchableOpacity 
                style={[styles.fab, {backgroundColor: showAddMenu ? '#444' : '#007acc'}]}
                onPress={() => setShowAddMenu(!showAddMenu)}
            >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
            </TouchableOpacity>
        </View>

        {/* MODAL FORM */}
        <Modal visible={!!showForm} transparent animationType="slide">
            <View style={styles.modalBg}>
                <View style={styles.modal}>
                    <Text style={styles.modalTitle}>Add {showForm?.toUpperCase()}</Text>
                    <TextInput placeholder="Name (Optional)" placeholderTextColor="#666" style={styles.input} onChangeText={t=>setConfig({...config, name:t})}/>
                    <TextInput placeholder="Host" placeholderTextColor="#666" style={styles.input} onChangeText={t=>setConfig({...config, host:t})}/>
                    <TextInput placeholder="Port" placeholderTextColor="#666" style={styles.input} defaultValue="22" onChangeText={t=>setConfig({...config, port:t})}/>
                    <TextInput placeholder="Username" placeholderTextColor="#666" style={styles.input} onChangeText={t=>setConfig({...config, user:t})}/>
                    <TextInput placeholder="Password" placeholderTextColor="#666" style={styles.input} secureTextEntry onChangeText={t=>setConfig({...config, password:t})}/>
                    
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => setShowForm(null)}><Text style={{color:'#ccc'}}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={connectSftp}><Text style={{color:'#007acc', fontWeight:'bold'}}>Connect</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e1e1e' },
    header: { padding: 15, fontSize: 18, fontWeight: 'bold', color: '#fff', borderBottomWidth: 1, borderBottomColor: '#333' },
    item: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#2b2b2b' },
    itemName: { color: '#fff', fontSize: 16 },
    itemSub: { color: '#666', fontSize: 12 },
    fabContainer: { position: 'absolute', bottom: 20, right: 20, alignItems: 'flex-end' },
    fab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5 },
    menu: { marginBottom: 10, backgroundColor: '#333', borderRadius: 8, padding: 5, elevation: 5 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 10, minWidth: 150 },
    menuText: { color: '#fff', marginLeft: 10 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modal: { backgroundColor: '#252526', padding: 20, borderRadius: 10 },
    modalTitle: { color: '#fff', fontSize: 18, marginBottom: 15, fontWeight: 'bold' },
    input: { backgroundColor: '#333', color: '#fff', padding: 10, borderRadius: 5, marginBottom: 10 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }
});