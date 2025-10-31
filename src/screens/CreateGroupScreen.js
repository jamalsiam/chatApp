import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { db } from '../config/firebase';
import authService from '../services/authService';
import chatService from '../services/chatService';

export default function CreateGroupScreen({ navigation }) {
    const [groupName, setGroupName] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const usersQuery = query(
                collection(db, 'users'),
                where('uid', '!=', currentUser.uid)
            );
            const snapshot = await getDocs(usersQuery);
            const usersList = [];
            snapshot.forEach(doc => {
                usersList.push({ id: doc.id, ...doc.data() });
            });
            setUsers(usersList);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (userId) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }

        if (selectedUsers.length < 1) {
            Alert.alert('Error', 'Please select at least one member');
            return;
        }

        setCreating(true);
        const result = await chatService.createGroupChat(
            currentUser.uid,
            groupName.trim(),
            selectedUsers
        );
        setCreating(false);

        if (result.success) {
            Alert.alert('Success', 'Group created successfully', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                }
            ]);
        } else {
            Alert.alert('Error', result.error);
        }
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

    const renderUser = ({ item }) => {
        const isSelected = selectedUsers.includes(item.id);

        return (
            <TouchableOpacity
                style={styles.userItem}
                onPress={() => toggleUserSelection(item.id)}
            >
                <View style={styles.userLeft}>
                    {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
                        </View>
                    )}
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.displayName}</Text>
                        <Text style={styles.userStatus}>{item.status || 'Hey there!'}</Text>
                    </View>
                </View>

                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Icon name="checkmark" size={18} color="#fff" />}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C5CE7" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Group</Text>
                <TouchableOpacity
                    onPress={handleCreateGroup}
                    disabled={creating || !groupName.trim() || selectedUsers.length === 0}
                >
                    <Text style={[
                        styles.createButton,
                        (creating || !groupName.trim() || selectedUsers.length === 0) && styles.createButtonDisabled
                    ]}>
                        {creating ? 'Creating...' : 'Create'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
                <TextInput
                    style={styles.input}
                    placeholder="Group name"
                    placeholderTextColor="#888"
                    value={groupName}
                    onChangeText={setGroupName}
                    maxLength={50}
                />
            </View>

            <View style={styles.selectedSection}>
                <Text style={styles.sectionTitle}>
                    Selected: {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''}
                </Text>
            </View>

            <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="people-outline" size={60} color="#444" />
                        <Text style={styles.emptyText}>No users found</Text>
                    </View>
                }
            />
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
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#2A2A2A',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    createButton: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6C5CE7',
    },
    createButtonDisabled: {
        color: '#444',
    },
    inputSection: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    input: {
        backgroundColor: '#2A2A2A',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 16,
    },
    selectedSection: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#2A2A2A',
    },
    sectionTitle: {
        fontSize: 14,
        color: '#888',
        fontWeight: '600',
    },
    list: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
    },
    userLeft: {
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
    userInfo: {
        marginLeft: 15,
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    userStatus: {
        fontSize: 13,
        color: '#888',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#6C5CE7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
        marginTop: 15,
    },
});
