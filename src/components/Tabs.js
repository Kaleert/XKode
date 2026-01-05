/* src/components/Tabs.js */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FileIcon from './FileIcon';

export default function Tabs({ files, activeFile, onTabClick, onCloseTab }) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {files.map(file => {
          const isActive = file.id === activeFile;
          return (
            <TouchableOpacity 
              key={file.id}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => onTabClick(file.id)}
              activeOpacity={0.8}
            >
              <FileIcon name={file.name} style={{ marginRight: 6 }} />
              <Text style={[styles.text, isActive && styles.activeText]}>
                {file.name}{file.isDirty ? ' •' : ''}
              </Text>
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); onCloseTab(file.id); }} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={16} color={isActive ? "#fff" : "#777"} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 38, backgroundColor: '#1e1e1e', borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    backgroundColor: '#252526', borderRightWidth: 1, borderRightColor: '#1e1e1e',
    height: '100%', maxWidth: 200
  },
  activeTab: { backgroundColor: '#1e1e1e', borderTopWidth: 2, borderTopColor: '#007acc' },
  text: { color: '#888', fontSize: 13, marginRight: 8 },
  activeText: { color: '#fff' },
  closeBtn: { padding: 4 }
});