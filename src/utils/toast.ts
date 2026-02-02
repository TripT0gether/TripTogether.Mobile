import Toast from 'react-native-toast-message';

/**
 * Toast utility functions with retro styling
 * Usage: import { showSuccessToast, showErrorToast, showInfoToast } from '@/utils/toast'
 */

export const showSuccessToast = (title: string, message?: string) => {
    Toast.show({
        type: 'success',
        text1: title,
        text2: message,
        position: 'bottom',
        visibilityTime: 3000,
        autoHide: true,
        bottomOffset: 40,
    });
};

export const showErrorToast = (title: string, message?: string) => {
    Toast.show({
        type: 'error',
        text1: title,
        text2: message,
        position: 'bottom',
        visibilityTime: 4000,
        autoHide: true,
        bottomOffset: 40,
    });
};

export const showInfoToast = (title: string, message?: string) => {
    Toast.show({
        type: 'info',
        text1: title,
        text2: message,
        position: 'bottom',
        visibilityTime: 3000,
        autoHide: true,
        bottomOffset: 40,
    });
};

// Hide any visible toast
export const hideToast = () => {
    Toast.hide();
};
