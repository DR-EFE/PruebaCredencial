import React, { useState } from 'react';
import {
    TextInput,
    TextInputProps,
    View,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    style,
    secureTextEntry,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    const borderColor = error
        ? theme.colors.error
        : isFocused
            ? theme.colors.primary
            : theme.colors.border;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text variant="caption" color={theme.colors.text.secondary} style={styles.label}>
                    {label}
                </Text>
            )}
            <View style={[styles.inputContainer, { borderColor }]}>
                {leftIcon && (
                    <Ionicons
                        name={leftIcon}
                        size={20}
                        color={theme.colors.text.secondary}
                        style={styles.leftIcon}
                    />
                )}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={theme.colors.text.hint}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={secureTextEntry && !isPasswordVisible}
                    {...props}
                />
                {secureTextEntry ? (
                    <TouchableOpacity onPress={togglePasswordVisibility} style={styles.rightIcon}>
                        <Ionicons
                            name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                            size={20}
                            color={theme.colors.text.secondary}
                        />
                    </TouchableOpacity>
                ) : rightIcon ? (
                    <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon} disabled={!onRightIconPress}>
                        <Ionicons name={rightIcon} size={20} color={theme.colors.text.secondary} />
                    </TouchableOpacity>
                ) : null}
            </View>
            {error && (
                <Text variant="small" color={theme.colors.error} style={styles.error}>
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.m,
    },
    label: {
        marginBottom: theme.spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.spacing.s + 4, // 12
        borderWidth: 1,
        height: 56,
        paddingHorizontal: theme.spacing.m,
    },
    leftIcon: {
        marginRight: theme.spacing.s,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text.primary,
        height: '100%',
    },
    rightIcon: {
        padding: theme.spacing.s,
    },
    error: {
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
});
