import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
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

        if (userBalance < 1) {
            Alert.alert('Insufficient Coins', 'You need at least 1 coin to send a message');
            return;
        }

        setSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        const result = await chatService.sendMessage(
            chatId,
            currentUser.uid,
            otherUser.id,
            messageText
        );

        setSending(false);

        if (!result.success) {
            Alert.alert('Error', result.error);
            setNewMessage(messageText); // Restore message on error
        } else {
            // Update balance
            setUserBalance(prev => prev - 1);
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

    const renderMessage = ({ item }) => {
        const isMyMessage = item.senderId === currentUser.uid;
        const messageTime = item.timestamp?.toDate?.();

        return (
            <View style={[
                styles.messageContainer,
                isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
            ]}>
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

                <View style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        isMyMessage ? styles.myMessageText : styles.theirMessageText
                    ]}>
                        {item.message}
                    </Text>
                    {messageTime && (
                        <Text style={[
                            styles.messageTime,
                            isMyMessage ? styles.myMessageTime : styles.theirMessageTime
                        ]}>
                            {format(messageTime, 'HH:mm')}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
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

            {/* Input Bar */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#888"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!newMessage.trim() || sending}
                >
                    {sending ? (
                        <Icon name="hourglass-outline" size={24} color="#fff" />
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
});