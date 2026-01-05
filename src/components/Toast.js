/* src/components/Toast.js */
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Toast({ message, type = 'info', onHide }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 50, duration: 300, useNativeDriver: true })
        ]).start();

        const timer = setTimeout(() => {
            hide();
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const hide = () => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: -50, duration: 300, useNativeDriver: true })
        ]).start(() => onHide && onHide());
    };

    let bg = '#333';
    let icon = 'information';
    if (type === 'error') { bg = '#b71c1c'; icon = 'alert-circle'; }
    if (type === 'success') { bg = '#2e7d32'; icon = 'check-circle'; }

    return (
        <Animated.View style={[styles.container, { opacity, transform: [{ translateY }], backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon} size={20} color="white" style={{marginRight: 10}} />
            <Text style={styles.text}>{message}</Text>
            <TouchableOpacity onPress={hide}>
                <MaterialCommunityIcons name="close" size={18} color="#ccc" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute', top: 0, left: 20, right: 20,
        padding: 15, borderRadius: 8, flexDirection: 'row', alignItems: 'center',
        zIndex: 9999, elevation: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5
    },
    text: { color: 'white', flex: 1, fontSize: 14 }
});