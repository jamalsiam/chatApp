import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from '../services/authService';
import userService from '../services/userService';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await authService.signOut();
            setLoading(false);
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account, messages, and all data. Are you absolutely sure?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    const result = await userService.deleteAccount(currentUser.uid);
                    if (result.success) {
                      await authService.signOut();
                    } else {
                      Alert.alert('Error', result.error || 'Failed to delete account');
                    }
                    setLoading(false);
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, iconColor = '#6C5CE7', showChevron = true, danger = false }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={loading}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: danger ? '#FF4757' : iconColor + '20' }]}>
          <Icon name={icon} size={22} color={danger ? '#FF4757' : iconColor} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && <Icon name="chevron-forward" size={20} color="#888" />}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.section}>
          <SettingItem
            icon="notifications"
            title="Notification Settings"
            subtitle="Manage push notifications"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <SettingItem
            icon="person-remove"
            title="Blocked Users"
            subtitle="Manage blocked accounts"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
        </View>

        {/* Privacy & Security Section */}
        <SectionHeader title="PRIVACY & SECURITY" />
        <View style={styles.section}>
          <SettingItem
            icon="lock-closed"
            title="Privacy"
            subtitle="Control your privacy settings"
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon')}
          />
          <SettingItem
            icon="shield-checkmark"
            title="Security"
            subtitle="Manage account security"
            onPress={() => Alert.alert('Coming Soon', 'Security settings will be available soon')}
          />
        </View>

        {/* App Settings Section */}
        <SectionHeader title="APP SETTINGS" />
        <View style={styles.section}>
          <SettingItem
            icon="color-palette"
            title="Appearance"
            subtitle="Theme and display options"
            onPress={() => Alert.alert('Coming Soon', 'Theme settings will be available soon')}
          />
          <SettingItem
            icon="language"
            title="Language"
            subtitle="English (US)"
            onPress={() => Alert.alert('Coming Soon', 'Language settings will be available soon')}
          />
        </View>

        {/* About Section */}
        <SectionHeader title="ABOUT" />
        <View style={styles.section}>
          <SettingItem
            icon="help-circle"
            title="Help & Support"
            subtitle="Get help or contact support"
            onPress={() => Alert.alert('Help & Support', 'For support, please contact: support@chatapp.com')}
          />
          <SettingItem
            icon="document-text"
            title="Terms & Privacy Policy"
            subtitle="Read our terms and policies"
            onPress={() => Alert.alert('Coming Soon', 'Terms and privacy policy will be available soon')}
          />
          <SettingItem
            icon="information-circle"
            title="App Version"
            subtitle="1.0.0"
            showChevron={false}
            onPress={() => {}}
          />
        </View>

        {/* Account Actions Section */}
        <SectionHeader title="ACCOUNT ACTIONS" />
        <View style={styles.section}>
          <SettingItem
            icon="log-out"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            iconColor="#FF9500"
          />
          <SettingItem
            icon="trash"
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={handleDeleteAccount}
            iconColor="#FF4757"
            danger={true}
          />
        </View>

        <View style={{ height: 40 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#1A1A1A',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginTop: 25,
    marginBottom: 10,
    marginLeft: 20,
  },
  section: {
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  dangerText: {
    color: '#FF4757',
  },
});
