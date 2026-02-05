import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    StyleProp,
} from 'react-native';
import { X, Users } from 'lucide-react-native';
import { theme, shadows, fonts } from '../constants/theme';

interface CreateGroupDialogProps {
    visible: boolean;
    onClose: () => void;
    onCreateGroup: (name: string) => void;
}

export default function CreateGroupDialog({ visible, onClose, onCreateGroup }: CreateGroupDialogProps) {
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!groupName.trim()) return;

        setLoading(true);
        try {
            await onCreateGroup(groupName.trim());
            setGroupName('');
            onClose();
        } catch (error) {
            console.error('Failed to create group:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={styles.backdrop}
                onPress={onClose}
            >
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    style={styles.dialogContainer}
                >
                    <View style={[styles.dialog, shadows.retro]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <View style={styles.iconContainer}>
                                    <Users size={20} color={theme.primary} />
                                </View>
                                <Text style={styles.title}>Create Group</Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                style={styles.closeButton}
                            >
                                <X size={18} color={theme.mutedForeground} />
                            </Pressable>
                        </View>

                        {/* Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Group Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter group name..."
                                placeholderTextColor={theme.mutedForeground}
                                value={groupName}
                                onChangeText={setGroupName}
                                autoFocus
                            />
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <Pressable
                                onPress={onClose}
                                style={({ pressed }) => ([
                                    styles.cancelButton,
                                    pressed && styles.buttonPressed,
                                ].filter(Boolean) as StyleProp<ViewStyle>)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleCreate}
                                disabled={loading || !groupName.trim()}
                                style={({ pressed }) => ([
                                    styles.createButton,
                                    (!groupName.trim() || loading) && styles.createButtonDisabled,
                                    pressed && !loading && groupName.trim() && styles.buttonPressed,
                                ].filter(Boolean) as StyleProp<ViewStyle>)}
                            >
                                {loading ? (
                                    <ActivityIndicator color={theme.primaryForeground} size="small" />
                                ) : (
                                    <Text style={styles.createButtonText}>Create</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 448,
    },
    dialog: {
        backgroundColor: theme.card,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.primary,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${theme.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: fonts.regular,
        color: theme.foreground,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: theme.border,
        alignItems: 'center',
        backgroundColor: theme.card,
    },
    cancelButtonText: {
        fontFamily: fonts.semiBold,
        color: theme.mutedForeground,
        fontSize: 16,
    },
    createButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: theme.primary,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        fontFamily: fonts.semiBold,
        color: theme.primaryForeground,
        fontSize: 16,
    },
    buttonPressed: {
        opacity: 0.7,
    },
});
