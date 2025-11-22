import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { theme } from '../theme';

export interface CardProps extends ViewProps {
    variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    variant = 'elevated',
    ...props
}) => {
    const getStyle = () => {
        switch (variant) {
            case 'elevated':
                return styles.elevated;
            case 'outlined':
                return styles.outlined;
            case 'flat':
                return styles.flat;
            default:
                return styles.elevated;
        }
    };

    return (
        <View style={[styles.container, getStyle(), style]} {...props}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.spacing.m,
        padding: theme.spacing.m,
    },
    elevated: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    outlined: {
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    flat: {
        backgroundColor: 'transparent',
    },
});
