import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    Alert,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    User,
    Mail,
    Calendar,
    Trash2,
    Edit,
    Save,
    X,
    AlertTriangle,
    QrCode,
    CheckCircle2,
    XCircle,
} from 'lucide-react-native';
import { userService } from '../src/services/userService';
import { authService } from '../src/services/authService';
import { showErrorToast, showSuccessToast } from '../src/utils/toast';
import RetroGrid from '../src/components/RetroGrid';
import { theme, shadows, fonts } from '../src/constants/theme';
import type { User as UserType } from '../src/types/user.types';

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');

    // Edit form state
    const [editedUsername, setEditedUsername] = useState('');
    const [editedGender, setEditedGender] = useState(false);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const profile = await userService.getCurrentUser();
            setUser(profile);
            setEditedUsername(profile.username);
            setEditedGender(profile.gender);
        } catch (error: any) {
            showErrorToast('Error', error.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!editedUsername.trim()) {
            showErrorToast('Invalid Input', 'Username cannot be empty');
            return;
        }

        setSaving(true);
        try {
            const updatedUser = await userService.updateProfile({
                username: editedUsername.trim(),
                gender: editedGender,
            });
            setUser(updatedUser);
            setEditMode(false);
            showSuccessToast('Success', 'Profile updated successfully');
        } catch (error: any) {
            showErrorToast('Update Failed', error.message || 'Could not update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (user) {
            setEditedUsername(user.username);
            setEditedGender(user.gender);
        }
        setEditMode(false);
    };

    const handleDeleteAccount = () => {
        setDeleteModalVisible(true);
        setConfirmationText('');
    };

    const confirmDeleteAccount = async () => {
        if (confirmationText.toLowerCase() !== 'delete') {
            showErrorToast('Confirmation Failed', 'Please type "delete" to confirm');
            return;
        }

        setDeleting(true);
        try {
            await userService.deleteAccount();
            await authService.logout();
            showSuccessToast('Account Deleted', 'Your account has been deleted');
            setDeleteModalVisible(false);
            router.replace('/(auth)/login');
        } catch (error: any) {
            showErrorToast('Deletion Failed', error.message || 'Could not delete account');
            setDeleting(false);
        }
    };

    const getInitials = () => {
        if (!user?.username) return '?';
        const names = user.username.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return user.username.substring(0, 2).toUpperCase();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <RetroGrid>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </RetroGrid>
        );
    }

    if (!user) {
        return (
            <RetroGrid>
                <View style={styles.loadingContainer}>
                    <AlertTriangle size={48} color={theme.destructive} />
                    <Text style={styles.errorText}>Failed to load profile</Text>
                    <Pressable
                        onPress={loadUserProfile}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </Pressable>
                </View>
            </RetroGrid>
        );
    }

    return (
        <RetroGrid>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{getInitials()}</Text>
                    </View>
                    <Text style={styles.usernameTitle}>{user.username}</Text>
                    {user.isEmailVerified && (
                        <View style={styles.verifiedBadge}>
                            <CheckCircle2 size={16} color={theme.accent} />
                            <Text style={styles.verifiedText}>Verified Account</Text>
                        </View>
                    )}
                    {!user.isEmailVerified && (
                        <View style={styles.unverifiedBadge}>
                            <XCircle size={16} color={theme.destructive} />
                            <Text style={styles.unverifiedText}>Email Not Verified</Text>
                        </View>
                    )}
                </View>

                {/* Profile Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Profile Information</Text>
                        {!editMode && (
                            <Pressable
                                onPress={() => setEditMode(true)}
                                style={styles.editButton}
                            >
                                <Edit size={18} color={theme.primary} />
                                <Text style={styles.editButtonText}>Edit</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* Username */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldLabel}>
                            <User size={18} color={theme.mutedForeground} />
                            <Text style={styles.labelText}>Username</Text>
                        </View>
                        {editMode ? (
                            <TextInput
                                style={styles.input}
                                value={editedUsername}
                                onChangeText={setEditedUsername}
                                placeholder="Enter username"
                                placeholderTextColor={theme.mutedForeground}
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{user.username}</Text>
                        )}
                    </View>

                    {/* Email */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldLabel}>
                            <Mail size={18} color={theme.mutedForeground} />
                            <Text style={styles.labelText}>Email</Text>
                        </View>
                        <Text style={styles.fieldValue}>{user.email}</Text>
                    </View>

                    {/* Gender */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldLabel}>
                            <User size={18} color={theme.mutedForeground} />
                            <Text style={styles.labelText}>Gender</Text>
                        </View>
                        {editMode ? (
                            <View style={styles.genderToggle}>
                                <Pressable
                                    onPress={() => setEditedGender(true)}
                                    style={[
                                        styles.genderButton,
                                        editedGender && styles.genderButtonActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.genderButtonText,
                                            editedGender && styles.genderButtonTextActive,
                                        ]}
                                    >
                                        Male
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setEditedGender(false)}
                                    style={[
                                        styles.genderButton,
                                        !editedGender && styles.genderButtonActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.genderButtonText,
                                            !editedGender && styles.genderButtonTextActive,
                                        ]}
                                    >
                                        Female
                                    </Text>
                                </Pressable>
                            </View>
                        ) : (
                            <Text style={styles.fieldValue}>
                                {user.gender ? 'Male' : 'Female'}
                            </Text>
                        )}
                    </View>

                    {/* Created At */}
                    <View style={styles.fieldContainer}>
                        <View style={styles.fieldLabel}>
                            <Calendar size={18} color={theme.mutedForeground} />
                            <Text style={styles.labelText}>Member Since</Text>
                        </View>
                        <Text style={styles.fieldValue}>{formatDate(user.createdAt)}</Text>
                    </View>

                    {/* Edit Mode Actions */}
                    {editMode && (
                        <View style={styles.editActions}>
                            <Pressable
                                onPress={handleCancelEdit}
                                style={styles.cancelButton}
                                disabled={saving}
                            >
                                <X size={18} color={theme.mutedForeground} />
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSaveChanges}
                                style={styles.saveButton}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={theme.primaryForeground} />
                                ) : (
                                    <>
                                        <Save size={18} color={theme.primaryForeground} />
                                        <Text style={styles.saveButtonText}>Save Changes</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Payment QR Code Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Payment QR Code</Text>
                        <QrCode size={20} color={theme.secondary} />
                    </View>
                    <View style={styles.qrPlaceholder}>
                        <QrCode size={48} color={theme.border} />
                        <Text style={styles.qrPlaceholderText}>QR Code Feature</Text>
                        <Text style={styles.qrPlaceholderSubtext}>Coming Soon</Text>
                    </View>
                </View>

                {/* Danger Zone */}
                {!editMode && (
                    <View style={styles.dangerCard}>
                        <View style={styles.dangerHeader}>
                            <AlertTriangle size={20} color={theme.destructive} />
                            <Text style={styles.dangerTitle}>Danger Zone</Text>
                        </View>
                        <Text style={styles.dangerDescription}>
                            Once you delete your account, there is no going back. Please be certain.
                        </Text>
                        <Pressable
                            onPress={handleDeleteAccount}
                            style={styles.deleteButton}
                        >
                            <Trash2 size={18} color={theme.destructive} />
                            <Text style={styles.deleteButtonText}>Delete Account</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <AlertTriangle size={32} color={theme.destructive} />
                            <Text style={styles.modalTitle}>Delete Account?</Text>
                        </View>
                        <Text style={styles.modalDescription}>
                            This action cannot be undone. All your data will be permanently deleted.
                        </Text>
                        <Text style={styles.modalInstruction}>
                            Type <Text style={styles.boldText}>delete</Text> to confirm:
                        </Text>
                        <TextInput
                            style={styles.confirmationInput}
                            value={confirmationText}
                            onChangeText={setConfirmationText}
                            placeholder="Type 'delete' here"
                            placeholderTextColor={theme.mutedForeground}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <View style={styles.modalActions}>
                            <Pressable
                                onPress={() => setDeleteModalVisible(false)}
                                style={styles.modalCancelButton}
                                disabled={deleting}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={confirmDeleteAccount}
                                style={styles.modalDeleteButton}
                                disabled={deleting || confirmationText.toLowerCase() !== 'delete'}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color={theme.primaryForeground} />
                                ) : (
                                    <Text style={styles.modalDeleteText}>Delete Forever</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </RetroGrid>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.destructive,
        marginBottom: 16,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: theme.primary,
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
        paddingTop: 20,
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${theme.primary}20`,
        borderWidth: 3,
        borderColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        ...shadows.retro,
    },
    avatarText: {
        fontSize: 36,
        fontFamily: fonts.bold,
        color: theme.primary,
    },
    usernameTitle: {
        fontSize: 24,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginBottom: 8,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: `${theme.accent}15`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.accent,
    },
    verifiedText: {
        fontSize: 12,
        fontFamily: fonts.medium,
        color: theme.accent,
    },
    unverifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: `${theme.destructive}15`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.destructive,
    },
    unverifiedText: {
        fontSize: 12,
        fontFamily: fonts.medium,
        color: theme.destructive,
    },
    card: {
        backgroundColor: theme.card,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.border,
        padding: 20,
        marginBottom: 16,
        ...shadows.retro,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: theme.border,
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: `${theme.primary}10`,
        borderRadius: 8,
    },
    editButtonText: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.primary,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    fieldLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    labelText: {
        fontSize: 12,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fieldValue: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: theme.foreground,
        paddingLeft: 26,
    },
    input: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: theme.foreground,
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginLeft: 26,
    },
    genderToggle: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 26,
    },
    genderButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: 8,
        alignItems: 'center',
    },
    genderButtonActive: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    genderButtonText: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.foreground,
    },
    genderButtonTextActive: {
        color: theme.primaryForeground,
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 2,
        borderTopColor: theme.border,
    },
    cancelButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: theme.muted,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: theme.border,
    },
    cancelButtonText: {
        fontSize: 14,
        fontFamily: fonts.semiBold,
        color: theme.mutedForeground,
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: theme.primary,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: theme.primary,
    },
    saveButtonText: {
        fontSize: 14,
        fontFamily: fonts.semiBold,
        color: theme.primaryForeground,
    },
    qrPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: theme.muted,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: theme.border,
        borderStyle: 'dashed',
    },
    qrPlaceholderText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.mutedForeground,
        marginTop: 12,
    },
    qrPlaceholderSubtext: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginTop: 4,
    },
    dangerCard: {
        backgroundColor: `${theme.destructive}10`,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.destructive,
        padding: 20,
        marginBottom: 16,
    },
    dangerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    dangerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.destructive,
    },
    dangerDescription: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.foreground,
        marginBottom: 16,
        lineHeight: 20,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: theme.destructive,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: theme.destructive,
    },
    deleteButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: theme.card,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.destructive,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        ...shadows.retro,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: fonts.bold,
        color: theme.destructive,
        marginTop: 12,
    },
    modalDescription: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.foreground,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    modalInstruction: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.foreground,
        marginBottom: 12,
    },
    boldText: {
        fontFamily: fonts.bold,
        color: theme.destructive,
    },
    confirmationInput: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: theme.foreground,
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: theme.muted,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.border,
    },
    modalCancelText: {
        fontSize: 16,
        fontFamily: fonts.semiBold,
        color: theme.foreground,
    },
    modalDeleteButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: theme.destructive,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.destructive,
    },
    modalDeleteText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
});
