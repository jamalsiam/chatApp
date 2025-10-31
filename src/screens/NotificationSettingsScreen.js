import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

export default function NotificationSettingsScreen({ navigation }) {
    const [settings, setSettings] = useState({
        enabled: true,
        sound: true,
        vibration: true,
        messageNotifications: true,
        followNotifications: true,
        likeNotifications: true,
        commentNotifications: true,
        showPreview: true,
        muteFrom: null,
        muteTo: null,
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (newSettings) => {
        try {
            await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
            setSettings(newSettings);
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    const updateSetting = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);
    };

    const setQuietHours = () => {
        Alert.alert(
            'Quiet Hours',
            'Set a time range when you don\'t want to receive notifications',
            [
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        updateSetting('muteFrom', null);
                        updateSetting('muteTo', null);
                    }
                },
                {
                    text: '10 PM - 8 AM',
                    onPress: () => {
                        const newSettings = {
                            ...settings,
                            muteFrom: '22:00',
                            muteTo: '08:00'
                        };
                        saveSettings(newSettings);
                    }
                },
                {
                    text: '11 PM - 7 AM',
                    onPress: () => {
                        const newSettings = {
                            ...settings,
                            muteFrom: '23:00',
                            muteTo: '07:00'
                        };
                        saveSettings(newSettings);
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const SettingItem = ({ icon, title, subtitle, value, onValueChange, type = 'switch' }) => (
        <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
                <Icon name={icon} size={24} color="#6C5CE7" style={styles.settingIcon} />
                <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>{title}</Text>
                    {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
                </View>
            </View>
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#444', true: '#6C5CE7' }}
                    thumbColor="#fff"
                />
            ) : (
                <TouchableOpacity onPress={onValueChange}>
                    <Icon name="chevron-forward" size={24} color="#888" />
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* General Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>GENERAL</Text>

                    <SettingItem
                        icon="notifications"
                        title="Enable Notifications"
                        subtitle="Turn all notifications on or off"
                        value={settings.enabled}
                        onValueChange={(value) => updateSetting('enabled', value)}
                    />

                    <SettingItem
                        icon="volume-high"
                        title="Sound"
                        subtitle="Play sound for notifications"
                        value={settings.sound && settings.enabled}
                        onValueChange={(value) => updateSetting('sound', value)}
                    />

                    <SettingItem
                        icon="phone-portrait"
                        title="Vibration"
                        subtitle="Vibrate for notifications"
                        value={settings.vibration && settings.enabled}
                        onValueChange={(value) => updateSetting('vibration', value)}
                    />

                    <SettingItem
                        icon="eye"
                        title="Show Preview"
                        subtitle="Show message preview in notifications"
                        value={settings.showPreview && settings.enabled}
                        onValueChange={(value) => updateSetting('showPreview', value)}
                    />
                </View>

                {/* Notification Types */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>NOTIFICATION TYPES</Text>

                    <SettingItem
                        icon="chatbubble"
                        title="Messages"
                        subtitle="New message notifications"
                        value={settings.messageNotifications && settings.enabled}
                        onValueChange={(value) => updateSetting('messageNotifications', value)}
                    />

                    <SettingItem
                        icon="person-add"
                        title="Followers"
                        subtitle="New follower notifications"
                        value={settings.followNotifications && settings.enabled}
                        onValueChange={(value) => updateSetting('followNotifications', value)}
                    />

                    <SettingItem
                        icon="heart"
                        title="Likes"
                        subtitle="Post like notifications"
                        value={settings.likeNotifications && settings.enabled}
                        onValueChange={(value) => updateSetting('likeNotifications', value)}
                    />

                    <SettingItem
                        icon="chatbubbles"
                        title="Comments"
                        subtitle="Comment notifications"
                        value={settings.commentNotifications && settings.enabled}
                        onValueChange={(value) => updateSetting('commentNotifications', value)}
                    />
                </View>

                {/* Quiet Hours */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>QUIET HOURS</Text>

                    <TouchableOpacity style={styles.quietHoursItem} onPress={setQuietHours}>
                        <View style={styles.settingLeft}>
                            <Icon name="moon" size={24} color="#6C5CE7" style={styles.settingIcon} />
                            <View style={styles.settingText}>
                                <Text style={styles.settingTitle}>Quiet Hours</Text>
                                {settings.muteFrom && settings.muteTo ? (
                                    <Text style={styles.settingSubtitle}>
                                        {settings.muteFrom} - {settings.muteTo}
                                    </Text>
                                ) : (
                                    <Text style={styles.settingSubtitle}>Not set</Text>
                                )}
                            </View>
                        </View>
                        <Icon name="chevron-forward" size={24} color="#888" />
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                    <Icon name="information-circle" size={20} color="#888" />
                    <Text style={styles.infoText}>
                        These settings control how you receive notifications from the app.
                        Changes take effect immediately.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A1A1A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#2A2A2A',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    content: {
        flex: 1,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        marginLeft: 20,
        marginBottom: 8,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2A2A2A',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIcon: {
        marginRight: 15,
    },
    settingText: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#888',
    },
    quietHoursItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2A2A2A',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        margin: 20,
        padding: 15,
        backgroundColor: '#2A2A2A',
        borderRadius: 8,
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        color: '#888',
        lineHeight: 18,
    },
    loadingText: {
        color: '#888',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
});
