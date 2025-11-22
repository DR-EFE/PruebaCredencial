import { TextStyle } from 'react-native';

export const typography = {
    h1: {
        fontSize: 28,
        fontWeight: 'bold',
        lineHeight: 34,
    } as TextStyle,
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 30,
    } as TextStyle,
    h3: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 26,
    } as TextStyle,
    body: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
    } as TextStyle,
    caption: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
    } as TextStyle,
    small: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 16,
    } as TextStyle,
    button: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 24,
    } as TextStyle,
} as const;
