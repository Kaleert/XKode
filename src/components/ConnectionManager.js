/* src/components/ConnectionManager.js */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Switch, ScrollView, Alert, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ConnectionManager({ onClose, onToast }) {
    const [view, setView] = useState('list'); // 'list' | 'editor'
    const [profiles, setProfiles] = useState([]);
    
    // Editor State
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [host, setHost] = useState('');
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [port, setPort] = useState('22');
    const [protocol, setProtocol] = useState('sftp');
    const [autoAddSsh, setAutoAddSsh] = useState(true);

    useEffect(() => {
        loadProfiles();
        const backAction = () => {
            if (view === 'editor') { setView('list'); return true; }
            onClose(); return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [view]);

    const loadProfiles = async () => {
        try {
            const json = await AsyncStorage.getItem('SERVER_PROFILES');
            if (json) setProfiles(JSON.parse(json));
        } catch(e) {}
    };

    const handleSave = async () => {
        if (!host || !user) {
            onToast('Host and User are required', 'error');
            return;
        }

        let updated = [...profiles];
        const newProfile = {
            id: editingId || Date.now().toString(),
            name: name || `${user}@${host}`,
            host, user, password: pass, port, protocol
        };

        if (editingId) {
            // Update existing
            updated = updated.map(p => p.id === editingId ? newProfile : p);
        } else {
            // Create new
            updated.push(newProfile);
            // Auto add SSH if requested
            if (protocol === 'sftp' && autoAddSsh) {
                updated.push({
                    ...newProfile,
                    id: Date.now().toString() + '_ssh',
                    protocol: 'ssh',
                    name: `Term: ${newProfile.name}`
                });
            }
        }

        setProfiles(updated);
        await AsyncStorage.setItem('SERVER_PROFILES', JSON.stringify(updated));
        onToast('Profile saved', 'success');
        setView('list');
    };

    const handleDelete = async (id) => {
        const updated = profiles.filter(p => p.id !== id);
        setProfiles(updated);
        await AsyncStorage.setItem('SERVER_PROFILES', JSON.stringify(updated));
    };

    const openEditor = (profile = null) => {
        if (profile) {
            setEditingId(profile.id);
            setName(profile.name);
            setHost(profile.host);
            setUser(profile.user);
            setPass(profile.password);
            setPort(profile.port);
            setProtocol(profile.protocol);
            setAutoAddSsh(false); // Don't duplicate when editing
        } else {
            setEditingId(null);
            setName(''); setHost(''); setUser(''); setPass(''); setPort('22'); setProtocol('sftp'); setAutoAddSsh(true);
        }
        setView('editor');
    };

    // --- RENDER LIST ---
    const renderList = () => (
        <View style={{flex: 1}}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="arrow-left" size={24} color="#ccc" /></TouchableOpacity>
                <Text style={styles.title}>Connections</Text>
                <TouchableOpacity onPress={() => openEditor(null)}><MaterialCommunityIcons name="plus" size={28} color="#007acc" /></TouchableOpacity>
            </View>
            
            {profiles.length === 0 ? (
                <TouchableOpacity style={styles.emptyState} onPress={() => openEditor(null)}>
                    <MaterialCommunityIcons name="server-network-off" size={50} color="#444" />
                    <Text style={styles.emptyText}>No configured connections.</Text>
                    <Text style={[styles.emptyText, {color: '#007acc', marginTop: 5}]}>Tap here to add one</Text>
                </TouchableOpacity>
            ) : (
                <FlatList 
                    data={profiles}
                    keyExtractor={i => i.id}
                    renderItem={({item}) => (
                        <View style={styles.item}>
                            <View style={[styles.iconBox, {backgroundColor: item.protocol === 'ssh' ? '#2e7d32' : '#007acc'}]}>
                                <Text style={styles.iconText}>{item.protocol.toUpperCase()}</Text>
                            </View>
                            <View style={{flex: 1, marginLeft: 10}}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemSub}>{item.user}@{item.host}:{item.port}</Text>
                            </View>
                            <TouchableOpacity onPress={() => openEditor(item)} style={styles.actionBtn}>
                                <MaterialCommunityIcons name="pencil" size={20} color="#ccc" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                                <MaterialCommunityIcons name="delete" size={20} color="#f44" />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );

    // --- RENDER EDITOR ---
    const renderEditor = () => (
        <View style={{flex: 1}}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setView('list')}><MaterialCommunityIcons name="close" size={24} color="#ccc" /></TouchableOpacity>
                <Text style={styles.title}>{editingId ? 'Edit Profile' : 'New Connection'}</Text>
                <View style={{width: 24}}/>
            </View>
            
            <ScrollView style={{padding: 20}}>
                <Text style={styles.label}>Protocol</Text>
                <View style={styles.row}>
                    {['sftp', 'ftp', 'ssh'].map(p => (
                        <TouchableOpacity 
                            key={p} 
                            style={[styles.protoChip, protocol === p && styles.protoChipActive]}
                            onPress={() => { setProtocol(p); setPort(p==='ftp'?'21':'22'); }}
                        >
                            <Text style={[styles.protoText, protocol===p && {color:'white'}]}>{p.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Display Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="My Server" placeholderTextColor="#555"/>

                <View style={{flexDirection:'row', gap: 10}}>
                    <View style={{flex: 3}}>
                        <Text style={styles.label}>Host</Text>
                        <TextInput style={styles.input} value={host} onChangeText={setHost} placeholder="192.168.1.1" placeholderTextColor="#555"/>
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Port</Text>
                        <TextInput style={styles.input} value={port} onChangeText={setPort} keyboardType="numeric" placeholderTextColor="#555"/>
                    </View>
                </View>

                <Text style={styles.label}>Username</Text>
                <TextInput style={styles.input} value={user} onChangeText={setUser} placeholder="root" placeholderTextColor="#555"/>

                <Text style={styles.label}>Password</Text>
                <TextInput style={styles.input} value={pass} onChangeText={setPass} secureTextEntry placeholder="******" placeholderTextColor="#555"/>

                {!editingId && protocol === 'sftp' && (
                    <View style={styles.switchRow}>
                        <Text style={{color:'#ccc'}}>Also create SSH Terminal profile</Text>
                        <Switch value={autoAddSsh} onValueChange={setAutoAddSsh} trackColor={{true: '#007acc', false: '#444'}}/>
                    </View>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>SAVE CONNECTION</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    return <View style={styles.container}>{view === 'list' ? renderList() : renderEditor()}</View>;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e1e1e' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
    title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.7 },
    emptyText: { color: '#888', fontSize: 16, marginTop: 10 },
    item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#2b2b2b' },
    iconBox: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    iconText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
    itemName: { color: 'white', fontSize: 16, fontWeight: '500' },
    itemSub: { color: '#777', fontSize: 12 },
    actionBtn: { padding: 10 },
    
    // Editor styles
    label: { color: '#888', fontSize: 12, marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#252526', color: 'white', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#333', fontSize: 16 },
    row: { flexDirection: 'row', marginBottom: 10 },
    protoChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#2d2d2d', marginRight: 10, borderWidth: 1, borderColor: '#444' },
    protoChipActive: { backgroundColor: '#007acc', borderColor: '#007acc' },
    protoText: { color: '#aaa', fontWeight: 'bold' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, backgroundColor: '#252526', padding: 12, borderRadius: 6 },
    saveBtn: { backgroundColor: '#007acc', marginTop: 30, padding: 14, borderRadius: 6, alignItems: 'center' },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});