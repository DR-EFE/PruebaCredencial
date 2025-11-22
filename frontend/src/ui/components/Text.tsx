import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

export interface TextProps extends RNTextProps {
    variant?: keyof typeof theme.typography;
    color?: string;
    weight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Text: React.FC<TextProps> = ({
    children,
    style,
    variant = 'body',
    color = theme.colors.text.primary,
    weight,
    align,
    ...props
}) => {
    const textStyle = {
        ...theme.typography[variant],
        color,
        ...(weight && { fontWeight: weight }),
        ...(align && { textAlign: align }),
    };

    return (
        <RNText style={[textStyle, style]} {...props}>
            {children}
        </RNText>
    );
};
