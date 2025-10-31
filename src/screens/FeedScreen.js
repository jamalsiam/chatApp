import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Video } from 'expo-video';
import Icon from 'react-native-vector-icons/Ionicons';
import { db } from '../config/firebase';
import authService from '../services/authService';
import userService from '../services/userService';

export default function FeedScreen({ navigation }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            // Get all users from database
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allUsers = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Get gallery posts from all users
            const allPosts = [];

            for (const user of allUsers) {
                // Skip current user's posts
                if (user.id === currentUser.uid) continue;

                try {
                    // Get posts from this user's gallery
                    const userPosts = await userService.getUserGalleryPosts(user.id);

                    // Add posts with user info
                    userPosts.forEach(post => {
                        allPosts.push({
                            ...post,
                            userInfo: {
                                uid: user.uid,
                                displayName: user.displayName,
                                photoURL: user.photoURL,
                                email: user.email
                            }
                        });
                    });
                } catch (error) {
                    console.error(`Error loading posts for user ${user.id}:`, error);
                }
            }

            // Randomize the posts array
            const shuffledPosts = allPosts.sort(() => Math.random() - 0.5);

            setPosts(shuffledPosts);
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadPosts();
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

    const renderPost = ({ item }) => {
        return (
            <View style={styles.postContainer}>
                {/* Post Header */}
                <TouchableOpacity
                    style={styles.postHeader}
                    onPress={() => navigation.navigate('Profile', { userId: item.userId })}
                >
                    {item.userInfo?.photoURL ? (
                        <Image source={{ uri: item.userInfo.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{getInitials(item.userInfo?.displayName)}</Text>
                        </View>
                    )}
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.userInfo?.displayName || 'Unknown'}</Text>
                        <Text style={styles.postTime}>
                            {item.timestamp?.toDate?.()?.toLocaleDateString() || 'Just now'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Post Media */}
                {item.mediaType === 'image' ? (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('MediaViewer', {
                            mediaUrl: item.mediaUrl,
                            mediaType: 'image'
                        })}
                    >
                        <Image source={{ uri: item.mediaUrl }} style={styles.postMedia} resizeMode="cover" />
                    </TouchableOpacity>
                ) : (
                    <Video
                        source={{ uri: item.mediaUrl }}
                        style={styles.postMedia}
                        useNativeControls
                        resizeMode="cover"
                    />
                )}

                {/* Post Caption */}
                {item.caption && (
                    <View style={styles.captionContainer}>
                        <Text style={styles.caption}>
                            <Text style={styles.captionUser}>{item.userInfo?.displayName} </Text>
                            {item.caption}
                        </Text>
                    </View>
                )}
            </View>
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
                <Text style={styles.headerTitle}>Feed</Text>
            </View>

            {posts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="play-circle-outline" size={80} color="#444" />
                    <Text style={styles.emptyText}>No posts yet</Text>
                    <Text style={styles.emptySubtext}>Be the first to share photos and videos!</Text>
                    <TouchableOpacity
                        style={styles.findUsersButton}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Icon name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.findUsersText}>Upload to Gallery</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPost}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#6C5CE7"
                        />
                    }
                    contentContainerStyle={styles.list}
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
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 10,
    },
    findUsersButton: {
        flexDirection: 'row',
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        marginTop: 30,
        alignItems: 'center',
    },
    findUsersText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    list: {
        paddingBottom: 20,
    },
    postContainer: {
        backgroundColor: '#2A2A2A',
        marginBottom: 15,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userInfo: {
        marginLeft: 12,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    postTime: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    postMedia: {
        width: '100%',
        height: 400,
        backgroundColor: '#000',
    },
    captionContainer: {
        padding: 12,
    },
    caption: {
        fontSize: 14,
        color: '#fff',
        lineHeight: 18,
    },
    captionUser: {
        fontWeight: '600',
    },
});
