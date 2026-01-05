/* src/components/LogViewer.js */
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Logger from '../services/Logger';

export default function LogViewer({ visible, onClose, onToast }) {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (visible) {
            const unsub = Logger.subscribe(setLogs);
            return unsub;
        }
    }, [visible]);

    const handleExport = async () => {
        try {
            const path = await Logger.exportLogs();
            if(onToast) onToast(`Logs saved to: ${path}`, 'success');
        } catch (e) {
            if(onToast) onToast("Export failed", 'error');
        }
    };

    const getColor = (level) => {
        switch(level) {
            case 'error': return '#f44';
            case 'warn': return '#fa0';
            default: return '#ccc';
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Отступ под статусбар */}
                <View style={styles.statusBarPlaceholder} />
                
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="arrow-left" size={24} color="#ccc"/></TouchableOpacity>
                    <Text style={styles.title}>System Logs</Text>
                    <TouchableOpacity onPress={handleExport} style={styles.btn}>
                        <MaterialCommunityIcons name="folder-zip" size={20} color="#007acc" />
                        <Text style={styles.btnText}>Export</Text>
                    </TouchableOpacity>
                </View>

                <FlatList 
                    data={logs}
                    keyExtractor={i => i.id.toString()}
                    contentContainerStyle={{padding: 10}}
                    renderItem={({item}) => (
                        <View style={styles.row}>
                            <Text style={styles.time}>{item.timestamp}</Text>
                            <Text style={[styles.tag, {color: getColor(item.level)}]}>[{item.tag}]</Text>
                            <Text style={styles.msg}>{item.message}</Text>
                        </View>
                    )}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e1e1e' },
    statusBarPlaceholder: { height: Platform.OS === 'android' ? StatusBar.currentHeight : 20, backgroundColor: '#1e1e1e' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
    title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 5 },
    btnText: { color: '#007acc', marginLeft: 5, fontWeight: 'bold' },
    row: { flexDirection: 'row', marginBottom: 6, flexWrap: 'wrap' },
    time: { color: '#666', marginRight: 8, fontSize: 12, fontFamily: 'monospace' },
    tag: { fontWeight: 'bold', marginRight: 8, fontSize: 12, fontFamily: 'monospace' },
    msg: { color: '#bbb', flex: 1, fontSize: 13 }
});