import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { db } from '../config/firebase';
import authService from '../services/authService';
import userService from '../services/userService';

export default function BlockedUsersScreen({ navigation }) {
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        loadBlockedUsers();
    }, []);

    const loadBlockedUsers = async () => {
        try {
            setLoading(true);
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                const blockedUserIds = userDoc.data().blockedUsers || [];

                // Fetch details for each blocked user
                const usersDetails = await Promise.all(
                    blockedUserIds.map(async (userId) => {
                        const profile = await userService.getUserProfile(userId);
                        return { id: userId, ...profile };
                    })
                );

                setBlockedUsers(usersDetails);
            }
        } catch (error) {
            console.error('Error loading blocked users:', error);
            Alert.alert('Error', 'Failed to load blocked users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleUnblock = (userId, displayName) => {
        Alert.alert(
            'Unblock User',
            `Unblock ${displayName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unblock',
                    onPress: async () => {
                        const result = await userService.unblockUser(currentUser.uid, userId);
                        if (result.success) {
                            setBlockedUsers(prev => prev.filter(u => u.id !== userId));
                            Alert.alert('Success', `${displayName} has been unblocked`);
                        } else {
                            Alert.alert('Error', result.error);
                        }
                    }
                }
            ]
        );
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const renderBlockedUser = ({ item }) => (
        <View style={styles.userItem}>
            <View style={styles.userInfo}>
                {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
                    </View>
                )}
                <View style={styles.userDetails}>
                    <Text style={styles.userName}>{item.displayName}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(item.id, item.displayName)}
            >
                <Text style={styles.unblockButtonText}>Unblock</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Blocked Users</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6C5CE7" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : blockedUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="ban-outline" size={60} color="#444" />
                    <Text style={styles.emptyText}>No Blocked Users</Text>
                    <Text style={styles.emptySubtext}>
                        Users you block will appear here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBlockedUser}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        loadBlockedUsers();
                    }}
                />
            )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        fontSize: 14,
        marginTop: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 15,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },
    listContent: {
        padding: 15,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2A2A2A',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userDetails: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 13,
        color: '#888',
    },
    unblockButton: {
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    unblockButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
