/* src/components/AccessoryBar.js */
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Ряд 1: Управление (17 кнопок)
const ROW1 = [
    { t: 'CTRL', type: 'mod' }, { t: 'SHIFT', type: 'mod' },
    { t: 'TAB', icon: 'keyboard-tab' }, { t: 'ESC' },
    { t: 'LEFT', icon: 'arrow-left' }, { t: 'DOWN', icon: 'arrow-down' }, 
    { t: 'UP', icon: 'arrow-up' }, { t: 'RIGHT', icon: 'arrow-right' },
    { t: 'PASTE', icon: 'content-paste' }, { t: 'UNDO', icon: 'undo' }, 
    { t: 'REDO', icon: 'redo' }, { t: 'SAVE', icon: 'content-save' },
    { t: 'SEARCH', icon: 'magnify' }, { t: 'HOME', icon: 'chevron-double-left' },
    { t: 'END', icon: 'chevron-double-right' }, { t: 'PGUP', icon: 'arrow-collapse-up' },
    { t: 'PGDN', icon: 'arrow-collapse-down' }
];

// Ряд 2: Символы (17 кнопок - выровнял количество)
const ROW2 = [
    '{', '}', '(', ')', '[', ']', '=', '=>', ';', ':', 
    '.', ',', '"', "'", '`', '<', '>'
];

// Добиваем второй ряд, если не хватает, или создаем пары
const createPairs = () => {
    const pairs = [];
    const max = Math.max(ROW1.length, ROW2.length);
    for(let i=0; i<max; i++) {
        pairs.push({ top: ROW1[i] || null, bottom: ROW2[i] || null });
    }
    return pairs;
};

export default function AccessoryBar({ onPress }) {
  const [isCtrl, setIsCtrl] = useState(false);
  const [isShift, setIsShift] = useState(false);
  
  const pairs = useMemo(() => createPairs(), []);

  const handlePress = (key) => {
      if (!key) return;
      if (key === 'CTRL') { setIsCtrl(!isCtrl); return; }
      if (key === 'SHIFT') { setIsShift(!isShift); return; }
      
      onPress(key, { ctrl: isCtrl, shift: isShift });
      if (isShift) setIsShift(false);
  };

  const KeyBtn = ({ item, height }) => {
      if (!item) return <View style={[styles.key, { height, backgroundColor: 'transparent', borderWidth: 0 }]} />;
      
      const t = typeof item === 'object' ? item.t : item;
      const icon = typeof item === 'object' ? item.icon : null;
      
      let bg = '#2d2d2d';
      let color = '#ccc';
      if (t === 'CTRL' && isCtrl) { bg = '#007acc'; color = 'white'; }
      if (t === 'SHIFT' && isShift) { bg = '#007acc'; color = 'white'; }

      return (
          <TouchableOpacity 
            style={[styles.key, { height, backgroundColor: bg }]} 
            onPress={() => handlePress(t)}
            activeOpacity={0.6}
          >
              {icon ? <MaterialCommunityIcons name={icon} size={20} color={color} /> : 
                      <Text style={[styles.keyText, {color}]}>{t}</Text>}
          </TouchableOpacity>
      );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
      >
          {pairs.map((pair, i) => (
              <View key={i} style={styles.column}>
                  <KeyBtn item={pair.top} height={38} />
                  <KeyBtn item={pair.bottom} height={38} />
              </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
      height: 86, // 38 + 38 + отступы
      backgroundColor: '#202020', 
      borderTopWidth: 1, 
      borderTopColor: '#333' 
  },
  scrollContent: {
      paddingHorizontal: 2,
      paddingVertical: 3
  },
  column: {
      flexDirection: 'column',
      marginHorizontal: 1,
      justifyContent: 'space-between',
      height: '100%' // Растягиваем на всю высоту контейнера
  },
  key: { 
      minWidth: 44, 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderRadius: 4,
      marginBottom: 2 // Отступ между верхним и нижним рядом
  },
  keyText: { 
      fontWeight: 'bold', 
      fontSize: 16, 
      fontFamily: 'monospace' 
  }
});