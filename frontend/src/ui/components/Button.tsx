import React from 'react';
import {
    TouchableOpacity,
    TouchableOpacityProps,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { theme } from '../theme';
import { Text } from './Text';

export interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    variant = 'primary',
    loading = false,
    disabled,
    style,
    leftIcon,
    rightIcon,
    textStyle,
    ...props
}) => {
    const getBackgroundColor = () => {
        if (disabled) return theme.colors.text.hint;
        switch (variant) {
            case 'primary':
                return theme.colors.primary;
            case 'secondary':
                return theme.colors.text.secondary;
            case 'outline':
            case 'ghost':
                return 'transparent';
            default:
                return theme.colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return theme.colors.surface;
        switch (variant) {
            case 'primary':
            case 'secondary':
                return theme.colors.text.inverse;
            case 'outline':
            case 'ghost':
                return theme.colors.primary;
            default:
                return theme.colors.text.inverse;
        }
    };

    const getBorderColor = () => {
        if (disabled) return 'transparent';
        if (variant === 'outline') return theme.colors.primary;
        return 'transparent';
    };

    const containerStyle: ViewStyle = {
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        borderWidth: variant === 'outline' ? 1 : 0,
        borderRadius: theme.spacing.s + 4, // 12
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        opacity: disabled || loading ? 0.7 : 1,
    };

    return (
        <TouchableOpacity
            style={[containerStyle, style]}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {leftIcon}
                    <Text
                        variant="button"
                        color={getTextColor()}
                        style={[{ marginHorizontal: leftIcon || rightIcon ? theme.spacing.s : 0 }, textStyle]}
                    >
                        {title}
                    </Text>
                    {rightIcon}
                </>
            )}
        </TouchableOpacity>
    );
};
