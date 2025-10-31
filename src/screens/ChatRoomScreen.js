import { format } from 'date-fns';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
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

export default function ChatRoomScreen({ route, navigation }) {
    const { chatId, otherUser } = route.params;
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [editingMessage, setEditingMessage] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const flatListRef = useRef(null);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        // Listen to messages
        const unsubscribe = chatService.listenToMessages(chatId, (msgs) => {
            setMessages(msgs);
        });

        // Mark messages as read
        chatService.markAsRead(chatId, currentUser.uid);

        // Get user balance
        loadUserBalance();

        return () => unsubscribe();
    }, [chatId]);

    const loadUserBalance = async () => {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            setUserBalance(userDoc.data().balanceCoins || 0);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        // Handle editing
        if (editingMessage) {
            setSending(true);
            const result = await chatService.editMessage(editingMessage.id, newMessage.trim());
            setSending(false);

            if (result.success) {
                setNewMessage('');
                setEditingMessage(null);
            } else {
                Alert.alert('Error', result.error);
            }
            return;
        }

        if (userBalance < 1) {
            Alert.alert('Insufficient Coins', 'You need at least 1 coin to send a message');
            return;
        }

        setSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        let result;
        // Handle replying
        if (replyingTo) {
            result = await chatService.sendReplyMessage(
                chatId,
                currentUser.uid,
                otherUser.id,
                messageText,
                replyingTo
            );
            setReplyingTo(null);
        } else {
            result = await chatService.sendMessage(
                chatId,
                currentUser.uid,
                otherUser.id,
                messageText
            );
        }

        setSending(false);

        if (!result.success) {
            Alert.alert('Error', result.error);
            setNewMessage(messageText);
        } else {
            setUserBalance(prev => prev - 1);
        }
    };

    const handleLongPress = (message) => {
        if (message.deleted) return;

        const isMyMessage = message.senderId === currentUser.uid;
        const options = ['Reply', 'React'];

        if (isMyMessage && !message.mediaUrl) {
            options.push('Edit', 'Delete');
        } else if (isMyMessage) {
            options.push('Delete');
        }

        options.push('Cancel');

        Alert.alert('Message Options', '', [
            {
                text: 'Reply',
                onPress: () => setReplyingTo(message)
            },
            {
                text: 'React',
                onPress: () => handleReactionPicker(message)
            },
            ...(isMyMessage && !message.mediaUrl ? [{
                text: 'Edit',
                onPress: () => handleEdit(message)
            }] : []),
            ...(isMyMessage ? [{
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDelete(message)
            }] : []),
            {
                text: 'Cancel',
                style: 'cancel'
            }
        ]);
    };

    const handleEdit = (message) => {
        setEditingMessage(message);
        setNewMessage(message.message);
        setReplyingTo(null);
    };

    const handleDelete = (message) => {
        Alert.alert(
            'Delete Message',
            'Are you sure you want to delete this message?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await chatService.deleteMessage(message.id, chatId);
                        if (!result.success) {
                            Alert.alert('Error', result.error);
                        }
                    }
                }
            ]
        );
    };

    const handleReactionPicker = (message) => {
        const reactions = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
        Alert.alert('React to Message', 'Choose a reaction', [
            ...reactions.map(emoji => ({
                text: emoji,
                onPress: () => handleReaction(message, emoji)
            })),
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const handleReaction = async (message, reaction) => {
        await chatService.addReaction(message.id, currentUser.uid, reaction);
    };

    const cancelEdit = () => {
        setEditingMessage(null);
        setNewMessage('');
    };

    const cancelReply = () => {
        setReplyingTo(null);
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

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need permission to access your photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Fixed: Use array instead of MediaTypeOptions
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled) {
            if (userBalance < 1) {
                Alert.alert('Insufficient Coins', 'You need at least 1 coin to send media');
                return;
            }

            setSending(true);
            
            try {
                let imageUri = result.assets[0].uri;
                
                // Convert HEIC/HEIF to JPEG if needed
                if (imageUri.toLowerCase().endsWith('.heic') || 
                    imageUri.toLowerCase().endsWith('.heif')) {
                  
                    const manipResult = await ImageManipulator.manipulateAsync(
                        imageUri,
                        [],
                        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    imageUri = manipResult.uri;
                   
                }
                
                const sendResult = await chatService.sendMediaMessage(
                    chatId,
                    currentUser.uid,
                    otherUser.id,
                    imageUri,
                    'image'
                );
                
                if (!sendResult.success) {
                    Alert.alert('Error', sendResult.error);
                } else {
                    setUserBalance(prev => prev - 1);
                }
            } catch (error) {
                console.error('Error sending image:', error);
                Alert.alert('Error', 'Failed to send image');
            } finally {
                setSending(false);
            }
        }
    };

    const handleVideoPick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need permission to access your videos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'], // Fixed: Use array instead of MediaTypeOptions
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled) {
            if (userBalance < 1) {
                Alert.alert('Insufficient Coins', 'You need at least 1 coin to send media');
                return;
            }

            setSending(true);
            const sendResult = await chatService.sendMediaMessage(
                chatId,
                currentUser.uid,
                otherUser.id,
                result.assets[0].uri,
                'video'
            );
            setSending(false);

            if (!sendResult.success) {
                Alert.alert('Error', sendResult.error);
            } else {
                setUserBalance(prev => prev - 1);
            }
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need camera permission');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled) {
            if (userBalance < 1) {
                Alert.alert('Insufficient Coins', 'You need at least 1 coin to send media');
                return;
            }

            setSending(true);
            
            try {
                let imageUri = result.assets[0].uri;
                
                // Convert HEIC/HEIF to JPEG if needed
                if (imageUri.toLowerCase().endsWith('.heic') || 
                    imageUri.toLowerCase().endsWith('.heif')) {
                   
                    const manipResult = await ImageManipulator.manipulateAsync(
                        imageUri,
                        [],
                        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    imageUri = manipResult.uri;
                    
                }
                
                const sendResult = await chatService.sendMediaMessage(
                    chatId,
                    currentUser.uid,
                    otherUser.id,
                    imageUri,
                    'image'
                );
                
                if (!sendResult.success) {
                    Alert.alert('Error', sendResult.error);
                } else {
                    setUserBalance(prev => prev - 1);
                }
            } catch (error) {
                console.error('Error sending photo:', error);
                Alert.alert('Error', 'Failed to send photo');
            } finally {
                setSending(false);
            }
        }
    };

    const handleMediaOptions = () => {
        Alert.alert(
            'Send Media',
            'Choose an option',
            [
                { text: 'Take Photo', onPress: handleTakePhoto },
                { text: 'Choose Image', onPress: handleImagePick },
                { text: 'Choose Video', onPress: handleVideoPick },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.senderId === currentUser.uid;
        const messageTime = item.timestamp?.toDate?.();
        const hasMedia = item.mediaUrl && item.mediaType;
        const reactions = item.reactions || {};
        const hasReactions = Object.keys(reactions).length > 0;

        // Show deleted message
        if (item.deleted) {
            return (
                <View style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
                ]}>
                    <View style={[
                        styles.messageBubble,
                        styles.deletedMessageBubble
                    ]}>
                        <Text style={styles.deletedMessageText}>
                            <Icon name="trash-outline" size={14} /> This message was deleted
                        </Text>
                    </View>
                </View>
            );
        }

        return (
            <TouchableOpacity
                onLongPress={() => handleLongPress(item)}
                delayLongPress={300}
                style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
                ]}
            >
                {!isMyMessage && (
                    <View style={styles.avatarSmall}>
                        {otherUser.photoURL ? (
                            <Image source={{ uri: otherUser.photoURL }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarTextSmall}>{getInitials(otherUser.displayName)}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={{ flex: 1 }}>
                    <View style={[
                        styles.messageBubble,
                        isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
                        hasMedia && styles.mediaBubble
                    ]}>
                        {/* Reply Preview */}
                        {item.replyTo && (
                            <View style={styles.replyPreview}>
                                <View style={styles.replyLine} />
                                <View style={styles.replyContent}>
                                    <Text style={styles.replyName}>
                                        {item.replyTo.senderId === currentUser.uid ? 'You' : otherUser.displayName}
                                    </Text>
                                    <Text style={styles.replyText} numberOfLines={1}>
                                        {item.replyTo.mediaType ? `${item.replyTo.mediaType === 'image' ? '📷' : '🎥'} ${item.replyTo.mediaType}` : item.replyTo.message}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Message Content */}
                        {hasMedia ? (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('MediaViewer', {
                                    mediaUrl: item.mediaUrl,
                                    mediaType: item.mediaType
                                })}
                            >
                                {item.mediaType === 'image' ? (
                                    <Image
                                        source={{ uri: item.mediaUrl }}
                                        style={styles.mediaPreview}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.videoPreview}>
                                        <Image
                                            source={{ uri: item.mediaUrl }}
                                            style={styles.mediaPreview}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.playIconOverlay}>
                                            <Icon name="play-circle" size={50} color="#fff" />
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <Text style={[
                                styles.messageText,
                                isMyMessage ? styles.myMessageText : styles.theirMessageText
                            ]}>
                                {item.message}
                            </Text>
                        )}

                        {/* Time and Status */}
                        <Text style={[
                            styles.messageTime,
                            isMyMessage ? styles.myMessageTime : styles.theirMessageTime
                        ]}>
                            {messageTime ? format(messageTime, 'HH:mm') : ''}
                            {item.edited && ' (edited)'}
                            {isMyMessage && item.read && ' ✓✓'}
                        </Text>
                    </View>

                    {/* Reactions */}
                    {hasReactions && (
                        <View style={[
                            styles.reactionsContainer,
                            isMyMessage ? styles.reactionsRight : styles.reactionsLeft
                        ]}>
                            {Object.entries(reactions).map(([emoji, users]) => (
                                <TouchableOpacity
                                    key={emoji}
                                    style={[
                                        styles.reactionBubble,
                                        users.includes(currentUser.uid) && styles.reactionBubbleActive
                                    ]}
                                    onPress={() => handleReaction(item, emoji)}
                                >
                                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                                    <Text style={styles.reactionCount}>{users.length}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    {otherUser.photoURL ? (
                        <Image source={{ uri: otherUser.photoURL }} style={styles.headerAvatar} />
                    ) : (
                        <View style={styles.headerAvatarPlaceholder}>
                            <Text style={styles.headerAvatarText}>{getInitials(otherUser.displayName)}</Text>
                        </View>
                    )}
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{otherUser.displayName}</Text>
                        <Text style={styles.headerStatus}>
                            {otherUser.isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <Text style={styles.coinsText}>{userBalance} 💰</Text>
                </View>
            </View>

            {/* Messages List */}
            {messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="chatbubbles-outline" size={60} color="#444" />
                    <Text style={styles.emptyText}>No messages yet</Text>
                    <Text style={styles.emptySubtext}>Send a message to start chatting!</Text>
                    <Text style={styles.costText}>💰 1 coin per message</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    inverted
                    contentContainerStyle={styles.messagesList}
                />
            )}

            {/* Sending indicator */}
            {sending && (
                <View style={styles.sendingIndicator}>
                    <ActivityIndicator color="#6C5CE7" />
                    <Text style={styles.sendingText}>Sending...</Text>
                </View>
            )}

            {/* Editing/Replying Banner */}
            {(editingMessage || replyingTo) && (
                <View style={styles.actionBanner}>
                    <View style={styles.actionBannerContent}>
                        <Icon
                            name={editingMessage ? "pencil" : "return-down-forward"}
                            size={16}
                            color="#6C5CE7"
                        />
                        <View style={styles.actionBannerText}>
                            <Text style={styles.actionBannerTitle}>
                                {editingMessage ? 'Editing message' : 'Replying to'}
                            </Text>
                            <Text style={styles.actionBannerMessage} numberOfLines={1}>
                                {editingMessage ? editingMessage.message : replyingTo?.message}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={editingMessage ? cancelEdit : cancelReply}
                        style={styles.actionBannerClose}
                    >
                        <Icon name="close" size={20} color="#888" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Input Bar */}
            <View style={styles.inputContainer}>
                <TouchableOpacity
                    style={styles.attachButton}
                    onPress={handleMediaOptions}
                    disabled={sending || editingMessage}
                >
                    <Icon name="add-circle" size={28} color={(sending || editingMessage) ? "#444" : "#6C5CE7"} />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#888"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={500}
                    editable={!sending}
                />

                <TouchableOpacity
                    style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!newMessage.trim() || sending}
                >
                    {sending ? (
                        <Icon name="hourglass-outline" size={24} color="#fff" />
                    ) : editingMessage ? (
                        <Icon name="checkmark" size={24} color="#fff" />
                    ) : (
                        <Icon name="send" size={24} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        paddingHorizontal: 15,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#2A2A2A',
        justifyContent: 'space-between',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 15,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerInfo: {
        marginLeft: 12,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    headerStatus: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    coinsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFD700',
    },
    messagesList: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 5,
        maxWidth: '80%',
    },
    myMessageContainer: {
        alignSelf: 'flex-end',
    },
    theirMessageContainer: {
        alignSelf: 'flex-start',
    },
    avatarSmall: {
        marginRight: 8,
    },
    avatarImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    avatarPlaceholder: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarTextSmall: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
        maxWidth: '100%',
    },
    myMessageBubble: {
        backgroundColor: '#6C5CE7',
        borderBottomRightRadius: 4,
    },
    theirMessageBubble: {
        backgroundColor: '#2A2A2A',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#fff',
    },
    theirMessageText: {
        color: '#fff',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
    },
    myMessageTime: {
        color: '#E0E0E0',
        textAlign: 'right',
    },
    theirMessageTime: {
        color: '#888',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#2A2A2A',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    input: {
        flex: 1,
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        color: '#fff',
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#444',
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
    costText: {
        fontSize: 14,
        color: '#FFD700',
        marginTop: 15,
        fontWeight: '600',
    },
    attachButton: {
        marginRight: 10,
    },
    mediaBubble: {
        padding: 4,
    },
    mediaPreview: {
        width: 200,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#333', // Placeholder color while loading
    },
    videoPreview: {
        position: 'relative',
    },
    playIconOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -25,
        marginLeft: -25,
    },
    sendingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: '#2A2A2A',
    },
    sendingText: {
        marginLeft: 8,
        color: '#888',
        fontSize: 12,
    },
    deletedMessageBubble: {
        backgroundColor: '#2A2A2A',
        opacity: 0.6,
    },
    deletedMessageText: {
        color: '#888',
        fontSize: 14,
        fontStyle: 'italic',
    },
    replyPreview: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    replyLine: {
        width: 3,
        backgroundColor: '#6C5CE7',
        borderRadius: 2,
        marginRight: 8,
    },
    replyContent: {
        flex: 1,
    },
    replyName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6C5CE7',
        marginBottom: 2,
    },
    replyText: {
        fontSize: 13,
        color: '#bbb',
    },
    reactionsContainer: {
        flexDirection: 'row',
        marginTop: 4,
        flexWrap: 'wrap',
    },
    reactionsRight: {
        justifyContent: 'flex-end',
    },
    reactionsLeft: {
        justifyContent: 'flex-start',
    },
    reactionBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A2A',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 4,
        marginTop: 2,
        borderWidth: 1,
        borderColor: '#333',
    },
    reactionBubbleActive: {
        backgroundColor: '#6C5CE7',
        borderColor: '#6C5CE7',
    },
    reactionEmoji: {
        fontSize: 14,
        marginRight: 4,
    },
    reactionCount: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },
    actionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#2A2A2A',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    actionBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    actionBannerText: {
        marginLeft: 10,
        flex: 1,
    },
    actionBannerTitle: {
        fontSize: 12,
        color: '#6C5CE7',
        fontWeight: '600',
        marginBottom: 2,
    },
    actionBannerMessage: {
        fontSize: 13,
        color: '#888',
    },
    actionBannerClose: {
        padding: 5,
    },
});