import React from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ViewProps,
} from 'react-native';
import { theme } from '../theme';

export interface ScreenProps extends ViewProps {
    safeArea?: boolean;
    keyboardAvoiding?: boolean;
    backgroundColor?: string;
}

export const Screen: React.FC<ScreenProps> = ({
    children,
    style,
    safeArea = true,
    keyboardAvoiding = true,
    backgroundColor = theme.colors.background,
    ...props
}) => {
    const Container = safeArea ? SafeAreaView : View;
    const content = (
        <View style={[styles.content, style]} {...props}>
            {children}
        </View>
    );

    return (
        <Container style={[styles.container, { backgroundColor }]}>
            <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
            {keyboardAvoiding ? (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoiding}
                >
                    {content}
                </KeyboardAvoidingView>
            ) : (
                content
            )}
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardAvoiding: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
