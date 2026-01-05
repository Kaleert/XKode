import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Сплеши с весами (шанс появления)
const SPLASHES = [
    { text: "Loading core", weight: 20 },
    { text: "Mounting file system", weight: 20 },
    { text: "Compiling shaders", weight: 5 },
    { text: "Initializing XKode Environment", weight: 15 },
    { text: "Hacking NASA", weight: 1, suffix: "(just kidding)" },
    { text: "Looking for node_modules", weight: 10 },
    { text: "Does anyone read these?", weight: 2 },
    { text: "Waking up the daemons", weight: 10 },
    { text: "Preparing workspace", weight: 20 },
    { text: "Checking permissions", weight: 20 },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getRandomSplash = () => {
    const totalWeight = SPLASHES.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < SPLASHES.length; i++) {
        if (random < SPLASHES[i].weight) return SPLASHES[i];
        random -= SPLASHES[i].weight;
    }
    return { text: "Loading", weight: 10 };
};

export default function CustomSplash({ onFinish }) {
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const textGlowAnim = useRef(new Animated.Value(0)).current;
    const [splashData] = useState(getRandomSplash());
    const [dots, setDots] = useState('');
    
    // Анимация точек
    useEffect(() => {
        const dotInterval = setInterval(() => {
            setDots(prev => {
                if (prev.length >= 3) return '';
                return prev + '.';
            });
        }, 300);

        return () => clearInterval(dotInterval);
    }, []);

    // Пульсация текста
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(textGlowAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(textGlowAnim, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: false,
                })
            ])
        ).start();
    }, []);

    // Анимация логотипа
    useEffect(() => {
        // Анимация логотипа (пульсация)
        Animated.loop(
            Animated.sequence([
                Animated.timing(logoScale, { 
                    toValue: 1, 
                    duration: 1500, 
                    useNativeDriver: true, 
                    easing: Easing.inOut(Easing.ease) 
                }),
                Animated.timing(logoScale, { 
                    toValue: 0.8, 
                    duration: 1500, 
                    useNativeDriver: true, 
                    easing: Easing.inOut(Easing.ease) 
                })
            ])
        ).start();

        // Имитация загрузки
        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true
            }).start(() => onFinish && onFinish());
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // Интерполяция для свечения текста
    const textShadowRadius = textGlowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 8]
    });

    const textOpacity = textGlowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1]
    });

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                <MaterialCommunityIcons name="xml" size={100} color="#007acc" />
            </Animated.View>
            
            <Text style={styles.title}>XKode</Text>
            <Text style={styles.version}>v0.1.0 (Outline)</Text>
            
            <View style={styles.loaderContainer}>
                <Animated.Text 
                    style={[
                        styles.splashText,
                        {
                            opacity: textOpacity,
                            textShadowRadius: textShadowRadius,
                        }
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    <Text style={styles.mainText}>
                        {splashData.text}
                        {splashData.suffix && (
                            <Text style={styles.suffixText}> {splashData.suffix}</Text>
                        )}
                    </Text>
                    <Text style={styles.dotsText}>{dots}</Text>
                </Animated.Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        backgroundColor: '#101010',
        justifyContent: 'center', 
        alignItems: 'center',
        zIndex: 9999, 
        elevation: 100
    },
    title: {
        color: 'white', 
        fontSize: 40, 
        fontWeight: 'bold',
        marginTop: 20, 
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 122, 204, 0.5)', 
        textShadowOffset: {width: 0, height: 0}, 
        textShadowRadius: 20
    },
    version: {
        color: '#666', 
        marginTop: 5, 
        fontStyle: 'italic',
        fontSize: 14,
    },
    loaderContainer: {
        position: 'absolute', 
        bottom: 100, 
        alignItems: 'center',
        width: '80%',
    },
    splashText: {
        color: '#ffeb3b',
        fontFamily: 'monospace',
        fontSize: 18,
        textShadowColor: '#ffeb3b',
        textShadowOffset: {width: 0, height: 0},
        includeFontPadding: false,
        textAlign: 'center',
    },
    mainText: {
        fontFamily: 'monospace',
        fontSize: 18,
        lineHeight: 24,
    },
    suffixText: {
        color: '#aaa',
        fontSize: 16,
        fontFamily: 'monospace',
        lineHeight: 24,
    },
    dotsText: {
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 24,
        includeFontPadding: false,
        minWidth: 20, // Фиксированная ширина для стабильности
    },
});