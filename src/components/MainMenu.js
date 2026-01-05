/* src/components/MainMenu.js */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MainMenu({ onClose, onSelect }) {
    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.menu}>
                    <TouchableOpacity style={styles.item} onPress={() => onSelect('save')}>
                        <MaterialCommunityIcons name="content-save" size={20} color="#ccc" style={{marginRight: 10}}/>
                        <Text style={styles.text}>Save File</Text>
                    </TouchableOpacity>
                    <View style={styles.divider}/>
                    <TouchableOpacity style={styles.item} onPress={() => onSelect('terminal')}>
                        <MaterialCommunityIcons name="console" size={20} color="#ccc" style={{marginRight: 10}}/>
                        <Text style={styles.text}>Terminal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.item} onPress={() => onSelect('connections')}>
                        <MaterialCommunityIcons name="server-network" size={20} color="#ccc" style={{marginRight: 10}}/>
                        <Text style={styles.text}>Connections</Text>
                    </TouchableOpacity>
                    <View style={styles.divider}/>
                    <TouchableOpacity style={styles.item} onPress={onClose}>
                        <MaterialCommunityIcons name="cog" size={20} color="#ccc" style={{marginRight: 10}}/>
                        <Text style={styles.text}>Settings</Text>
                    </TouchableOpacity>
                    <View style={styles.divider}/>
                    <TouchableOpacity style={styles.item} onPress={() => onSelect('logs')}>
                        <MaterialCommunityIcons name="text-box-outline" size={20} color="#ccc" style={{marginRight: 10}}/>
                        <Text style={styles.text}>System Logs</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'transparent' },
    menu: { position: 'absolute', top: 55, right: 10, width: 200, backgroundColor: '#333', borderRadius: 8, elevation: 10, paddingVertical: 5 },
    item: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    text: { color: 'white', fontSize: 16 },
    divider: { height: 1, backgroundColor: '#444', marginVertical: 2 }
});