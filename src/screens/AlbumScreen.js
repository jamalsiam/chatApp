import * as ImagePicker from 'expo-image-picker';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { db } from '../config/firebase';
import authService from '../services/authService';
import userService from '../services/userService';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 45) / 3;

export default function AlbumScreen({ navigation }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const postsQuery = query(
                collection(db, 'galleryPosts'),
                where('userId', '==', currentUser.uid),
                orderBy('timestamp', 'desc')
            );

            const postsSnapshot = await getDocs(postsQuery);
            const userPosts = [];

            postsSnapshot.forEach((doc) => {
                userPosts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            setPosts(userPosts);
        } catch (error) {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadPosts();
    };

    const handleUploadMedia = () => {
        Alert.alert(
            'Upload Media',
            'Choose an option',
            [
                { text: 'Take Photo', onPress: handleTakePhoto },
                { text: 'Choose from Library', onPress: handlePickMedia },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need camera permission');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled) {
            await uploadMedia(result.assets[0].uri, 'image');
        }
    };

    const handlePickMedia = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need library access permission');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            const mediaType = asset.type === 'video' ? 'video' : 'image';
            await uploadMedia(asset.uri, mediaType);
        }
    };

    const uploadMedia = async (uri, mediaType) => {
        try {
            setUploading(true);

            // Get caption from user
            Alert.prompt(
                'Add Caption',
                'Enter a caption for your post (optional)',
                async (caption) => {
                    const result = await userService.createGalleryPost(currentUser.uid, uri, mediaType, caption);

                    if (result.success) {
                        Alert.alert('Success', 'Post uploaded successfully');
                        loadPosts();
                    } else {
                        Alert.alert('Error', result.error || 'Failed to upload post');
                    }
                    setUploading(false);
                },
                'plain-text'
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to upload media');
            setUploading(false);
        }
    };

    const renderPost = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.postItem}
                onPress={() => navigation.navigate('MediaViewer', {
                    mediaUrl: item.mediaUrl,
                    mediaType: item.mediaType
                })}
            >
                <Image source={{ uri: item.mediaUrl }} style={styles.postImage} resizeMode="cover" />
                {item.mediaType === 'video' && (
                    <View style={styles.videoIndicator}>
                        <Icon name="play-circle" size={30} color="#fff" />
                    </View>
                )}
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
                <Text style={styles.headerTitle}>Album</Text>
                <TouchableOpacity onPress={handleUploadMedia} disabled={uploading}>
                    {uploading ? (
                        <ActivityIndicator size="small" color="#6C5CE7" />
                    ) : (
                        <Icon name="add-circle" size={28} color="#6C5CE7" />
                    )}
                </TouchableOpacity>
            </View>

            {posts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="images-outline" size={80} color="#444" />
                    <Text style={styles.emptyText}>No media yet</Text>
                    <Text style={styles.emptySubtext}>Upload photos and videos to your album</Text>
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={handleUploadMedia}
                        disabled={uploading}
                    >
                        <Icon name="cloud-upload" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.uploadButtonText}>Upload Media</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPost}
                    numColumns={3}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    list: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    postItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        margin: 5,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#2A2A2A',
        position: 'relative',
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    videoIndicator: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -15,
        marginLeft: -15,
    },
});
