/* src/components/SftpManager.js */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Switch, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SftpManager({ onClose, onConnect }) {
    const [profiles, setProfiles] = useState([]);
    // Form State
    const [name, setName] = useState('');
    const [host, setHost] = useState('');
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [port, setPort] = useState('22');
    const [protocol, setProtocol] = useState('sftp'); // sftp, ftp
    const [autoAddSsh, setAutoAddSsh] = useState(true); // Если создаем SFTP, добавить ли SSH профиль?

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            const json = await AsyncStorage.getItem('SERVER_PROFILES');
            if (json) setProfiles(JSON.parse(json));
        } catch(e) {}
    };

    const saveProfile = async () => {
        if (!host || !user) {
            Alert.alert('Error', 'Host and User are required');
            return;
        }

        const newProfile = {
            id: Date.now().toString(),
            name: name || `${user}@${host}`,
            host,
            user,
            password: pass,
            port,
            protocol // 'sftp' or 'ftp'
        };

        let updated = [...profiles, newProfile];

        // Автоматическое добавление SSH профиля, если это SFTP
        if (protocol === 'sftp' && autoAddSsh) {
            const sshProfile = {
                ...newProfile,
                id: Date.now().toString() + '_ssh',
                protocol: 'ssh',
                name: `Term: ${newProfile.name}`
            };
            // Проверяем, есть ли уже SSH с такими данными, чтобы не дублировать
            const exists = profiles.find(p => p.protocol === 'ssh' && p.host === host && p.port === port);
            if (!exists) {
                updated.push(sshProfile);
            }
        }

        setProfiles(updated);
        await AsyncStorage.setItem('SERVER_PROFILES', JSON.stringify(updated));
        
        // Сброс формы
        setName(''); setHost(''); setUser(''); setPass(''); setPort('22');
        Alert.alert('Success', 'Profile saved');
    };

    const deleteProfile = async (id) => {
        const updated = profiles.filter(p => p.id !== id);
        setProfiles(updated);
        await AsyncStorage.setItem('SERVER_PROFILES', JSON.stringify(updated));
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Connections Manager</Text>
                <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
                <Text style={styles.label}>Protocol</Text>
                <View style={styles.protocolRow}>
                    {['sftp', 'ftp', 'ssh'].map(p => (
                        <TouchableOpacity 
                            key={p} 
                            style={[styles.protoBtn, protocol === p && styles.protoBtnActive]}
                            onPress={() => {
                                setProtocol(p);
                                setPort(p === 'ftp' ? '21' : '22');
                            }}
                        >
                            <Text style={{color: protocol === p ? 'white' : '#aaa', fontWeight:'bold'}}>{p.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Display Name (Optional)</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="My Server" placeholderTextColor="#555"/>

                <View style={{flexDirection:'row', gap: 10}}>
                    <View style={{flex:3}}>
                        <Text style={styles.label}>Host / IP</Text>
                        <TextInput style={styles.input} value={host} onChangeText={setHost} placeholder="192.168.1.1" placeholderTextColor="#555"/>
                    </View>
                    <View style={{flex:1}}>
                        <Text style={styles.label}>Port</Text>
                        <TextInput style={styles.input} value={port} onChangeText={setPort} keyboardType="numeric" placeholder="22" placeholderTextColor="#555"/>
                    </View>
                </View>

                <Text style={styles.label}>Username</Text>
                <TextInput style={styles.input} value={user} onChangeText={setUser} placeholder="root" placeholderTextColor="#555"/>

                <Text style={styles.label}>Password</Text>
                <TextInput style={styles.input} value={pass} onChangeText={setPass} secureTextEntry placeholder="******" placeholderTextColor="#555"/>

                {protocol === 'sftp' && (
                    <View style={styles.switchRow}>
                        <Text style={{color:'#ccc'}}>Auto-create SSH Terminal profile</Text>
                        <Switch value={autoAddSsh} onValueChange={setAutoAddSsh} />
                    </View>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                    <Text style={{color:'white', fontWeight:'bold'}}>SAVE PROFILE</Text>
                </TouchableOpacity>

                <Text style={[styles.title, {marginTop: 20, marginBottom: 10}]}>Saved Profiles</Text>
                {profiles.map(item => (
                    <View key={item.id} style={styles.item}>
                        <View style={{flex:1}}>
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <View style={[styles.tag, {backgroundColor: item.protocol === 'ssh' ? '#4caf50' : '#007acc'}]}>
                                    <Text style={{color:'white', fontSize:10, fontWeight:'bold'}}>{item.protocol.toUpperCase()}</Text>
                                </View>
                                <Text style={styles.itemName}>{item.name}</Text>
                            </View>
                            <Text style={styles.itemSub}>{item.user}@{item.host}:{item.port}</Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteProfile(item.id)} style={{padding:5}}>
                            <MaterialCommunityIcons name="delete" size={20} color="#f44" />
                        </TouchableOpacity>
                    </View>
                ))}
                <View style={{height: 50}} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e1e1e', padding: 15 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    form: { flex: 1 },
    label: { color: '#aaa', fontSize: 12, marginBottom: 5, marginTop: 10 },
    input: { backgroundColor: '#252526', color: 'white', padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#333' },
    protocolRow: { flexDirection: 'row', marginBottom: 5 },
    protoBtn: { paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#252526', marginRight: 10, borderRadius: 5, borderWidth: 1, borderColor: '#333' },
    protoBtnActive: { backgroundColor: '#007acc', borderColor: '#007acc' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, backgroundColor: '#252526', padding: 10, borderRadius: 5 },
    saveBtn: { backgroundColor: '#007acc', padding: 12, alignItems: 'center', borderRadius: 5, marginTop: 20 },
    item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#252526', padding: 12, marginBottom: 8, borderRadius: 5, borderLeftWidth: 3, borderLeftColor: '#444' },
    tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginRight: 8 },
    itemName: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    itemSub: { color: '#777', fontSize: 12, marginTop: 2 }
});