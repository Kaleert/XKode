import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Welcome({ onOpenFile }) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="code-braces" size={80} color="#333" style={{marginBottom: 20}} />
      <Text style={styles.title}>Xkode</Text>
      <Text style={styles.version}>Version 0.1.0 (Outline)</Text>
      <Text style={styles.subtitle}>Editing evolved.</Text>

      <View style={styles.actions}>
          <TouchableOpacity style={styles.btn} onPress={onOpenFile}>
              <Text style={styles.link}>Show All Commands</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={onOpenFile}>
              <Text style={styles.link}>Go to File...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={onOpenFile}>
              <Text style={styles.link}>Open File/Folder</Text>
          </TouchableOpacity>
      </View>

      <View style={styles.recent}>
          <Text style={styles.recentTitle}>Recent</Text>
          <Text style={{color: '#555', fontStyle: 'italic'}}>No recent files</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center', paddingBottom: 50 },
  title: { color: '#ccc', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { color: '#666', fontSize: 16, marginBottom: 40 },
  actions: { width: '100%', maxWidth: 300, alignItems: 'flex-start' },
  btn: { marginBottom: 10 },
  version: { color: '#666', fontSize: 14, marginBottom: 5, fontStyle: 'italic' },
  link: { color: '#007acc', fontSize: 16 },
  recent: { marginTop: 40, width: '100%', maxWidth: 300 },
  recentTitle: { color: '#ccc', marginBottom: 10, fontSize: 14 }
});