import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from '../services/authService';

export default function HomeScreen() {
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    await authService.signOut();
  };

  return (
    <View style={styles.container}>
      <Icon name="checkmark-circle" size={80} color="#00D856" />
      <Text style={styles.title}>✅ Task 2 Complete!</Text>
      <Text style={styles.subtitle}>Authentication Working</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.label}>Welcome!</Text>
        <Text style={styles.value}>{user?.displayName || 'Guest'}</Text>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || 'Anonymous'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00D856',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
  },
  userInfo: {
    marginTop: 40,
    backgroundColor: '#2A2A2A',
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 30,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});