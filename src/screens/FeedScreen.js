import { collection, getDocs } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    FlatList,
    PanResponder
} from 'react-native';
import { Video, useVideoPlayer, VideoView } from 'expo-video';
import Icon from 'react-native-vector-icons/Ionicons';
import { db } from '../config/firebase';
import authService from '../services/authService';
import userService from '../services/userService';
import { formatDistanceToNow } from 'date-fns';

const { width, height } = Dimensions.get('window');

export default function FeedScreen({ navigation }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentUser = authService.getCurrentUser();
    const flatListRef = useRef(null);

    // Pan responder for swipe gestures
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Activate when horizontal movement is greater than vertical
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 30;
            },
            onPanResponderRelease: (evt, gestureState) => {
                const currentPost = posts[currentIndex];
                if (!currentPost) return;

                // Swipe right - go to user profile
                if (gestureState.dx > 50) {
                    navigation.navigate('Profile', { userId: currentPost.userId });
                }
                // Swipe left - go to chat list
                else if (gestureState.dx < -50) {
                    navigation.navigate('Chats');
                }
            },
        })
    ).current;

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allUsers = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const allPosts = [];

            for (const user of allUsers) {
                if (user.id === currentUser.uid) continue;

                try {
                    const userPosts = await userService.getUserGalleryPosts(user.id);

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
                    // Silently handle errors
                }
            }

            const shuffledPosts = allPosts.sort(() => Math.random() - 0.5);
            setPosts(shuffledPosts);
        } catch (error) {
            // Silently handle errors
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

    const getTimeAgo = (timestamp) => {
        try {
            const date = timestamp?.toDate?.();
            return date ? formatDistanceToNow(date, { addSuffix: true }) : '';
        } catch {
            return '';
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 80,
    }).current;

    const renderPost = ({ item, index }) => {
        const isVisible = index === currentIndex;

        return (
            <View style={styles.reelContainer}>
                {item.mediaType === 'image' ? (
                    <Image
                        source={{ uri: item.mediaUrl }}
                        style={styles.media}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.media}>
                        {isVisible && (
                            <Video
                                source={{ uri: item.mediaUrl }}
                                style={StyleSheet.absoluteFill}
                                useNativeControls={false}
                                resizeMode="cover"
                                isLooping
                                shouldPlay={isVisible}
                            />
                        )}
                    </View>
                )}

                {/* Overlay Content */}
                <View style={styles.overlay}>
                    {/* Top Bar */}
                    <View style={styles.topBar}>
                        <Text style={styles.feedTitle}>Feed</Text>
                    </View>

                    {/* Bottom Content */}
                    <View style={styles.bottomContent}>
                        {/* User Info */}
                        <TouchableOpacity
                            style={styles.userInfo}
                            onPress={() => navigation.navigate('Profile', { userId: item.userInfo.uid })}
                        >
                            {item.userInfo?.photoURL ? (
                                <Image source={{ uri: item.userInfo.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{getInitials(item.userInfo?.displayName)}</Text>
                                </View>
                            )}
                            <View style={styles.userDetails}>
                                <Text style={styles.userName}>{item.userInfo?.displayName || 'Unknown'}</Text>
                                <Text style={styles.postTime}>{getTimeAgo(item.timestamp)}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Caption */}
                        {item.caption && (
                            <Text style={styles.caption} numberOfLines={2}>
                                {item.caption}
                            </Text>
                        )}
                    </View>

                    {/* Side Actions */}
                    <View style={styles.sideActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Profile', { userId: item.userInfo.uid })}
                        >
                            <Icon name="person-outline" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
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

    if (posts.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Icon name="play-circle-outline" size={80} color="#444" />
                <Text style={styles.emptyText}>No posts yet</Text>
                <Text style={styles.emptySubtext}>Be the first to share photos and videos!</Text>
                <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Icon name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.uploadButtonText}>Upload to Gallery</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            <FlatList
                ref={flatListRef}
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={height}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                removeClippedSubviews={true}
                maxToRenderPerBatch={2}
                windowSize={3}
                initialNumToRender={1}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#fff"
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
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
        textAlign: 'center',
    },
    uploadButton: {
        flexDirection: 'row',
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        marginTop: 30,
        alignItems: 'center',
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    reelContainer: {
        width: width,
        height: height,
        backgroundColor: '#000',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topBar: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    feedTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    bottomContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
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
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    postTime: {
        fontSize: 12,
        color: '#ddd',
        marginTop: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    caption: {
        fontSize: 14,
        color: '#fff',
        lineHeight: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    sideActions: {
        position: 'absolute',
        right: 12,
        bottom: 100,
        alignItems: 'center',
    },
    actionButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
});
