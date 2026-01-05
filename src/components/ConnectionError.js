import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ConnectionError({ onRetry, serverUrl }) {
  const openTermux = () => Linking.openURL('termux://').catch(() => {});

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="server-network-off" size={80} color="#ff4444" />
      <Text style={styles.title}>Server Disconnected</Text>
      <Text style={styles.desc}>
        Could not connect to {serverUrl}.{"\n"}
        Make sure you launched the server in Termux:
      </Text>
      <View style={styles.codeBlock}>
        <Text style={styles.code}>cd termux-ide</Text>
        <Text style={styles.code}>node server</Text>
      </View>
      
      <TouchableOpacity style={styles.btnPrimary} onPress={openTermux}>
        <Text style={styles.btnText}>Open Termux</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.btnSecondary} onPress={onRetry}>
        <Text style={styles.btnTextSec}>Retry Connection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 20 },
  desc: { color: '#aaa', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  codeBlock: { backgroundColor: '#000', padding: 15, borderRadius: 8, marginVertical: 20, width: '100%' },
  code: { color: '#00ff00', fontFamily: 'monospace' },
  btnPrimary: { backgroundColor: '#007acc', padding: 12, borderRadius: 6, width: '100%', alignItems: 'center', marginBottom: 10 },
  btnSecondary: { backgroundColor: '#333', padding: 12, borderRadius: 6, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  btnTextSec: { color: '#ccc' }
});