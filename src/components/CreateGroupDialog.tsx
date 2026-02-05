import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    ActivityIndicator,
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
                className="flex-1 bg-black/50 justify-center items-center px-6"
                onPress={onClose}
            >
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    className="w-full max-w-md"
                >
                    <View
                        className="bg-card rounded-xl border-2 border-primary p-6"
                        style={shadows.retro}
                    >
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center gap-2">
                                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                                    <Users size={20} color={theme.primary} />
                                </View>
                                <Text className="text-xl font-bold text-foreground" style={{ fontFamily: fonts.bold }}>
                                    Create Group
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                className="w-8 h-8 rounded-full bg-muted items-center justify-center"
                            >
                                <X size={18} color={theme.mutedForeground} />
                            </Pressable>
                        </View>

                        {/* Input */}
                        <View className="mb-4">
                            <Text className="text-sm text-muted-foreground font-medium mb-2" style={{ fontFamily: fonts.medium }}>
                                Group Name
                            </Text>
                            <TextInput
                                className="bg-input border-2 border-border rounded-lg px-4 py-3 text-base text-foreground"
                                placeholder="Enter group name..."
                                placeholderTextColor={theme.mutedForeground}
                                value={groupName}
                                onChangeText={setGroupName}
                                style={{ fontFamily: fonts.regular }}
                                autoFocus
                            />
                        </View>

                        {/* Actions */}
                        <View className="flex-row gap-3">
                            <Pressable
                                onPress={onClose}
                                className="flex-1 py-3 rounded-lg border-2 border-border items-center"
                            >
                                <Text className="font-semibold text-muted-foreground" style={{ fontFamily: fonts.semiBold }}>
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleCreate}
                                disabled={loading || !groupName.trim()}
                                className={`flex-1 py-3 rounded-lg bg-primary items-center ${(!groupName.trim() || loading) ? 'opacity-50' : ''
                                    }`}
                            >
                                {loading ? (
                                    <ActivityIndicator color={theme.primaryForeground} size="small" />
                                ) : (
                                    <Text className="font-semibold text-primary-foreground" style={{ fontFamily: fonts.semiBold }}>
                                        Create
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
