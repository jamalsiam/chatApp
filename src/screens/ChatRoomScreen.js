import { Audio } from 'expo-av';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    View,
    Modal,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { db } from '../config/firebase';
import authService from '../services/authService';
import chatService from '../services/chatService';
import userService from '../services/userService';
import callService from '../services/callService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChatRoomScreen({ route, navigation }) {
    const { chatId, otherUser } = route.params;
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userBalance, setUserBalance] = useState(0);
    const [editingMessage, setEditingMessage] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [otherUserData, setOtherUserData] = useState(otherUser);
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isBlockedByOther, setIsBlockedByOther] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Voice message states
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playingSound, setPlayingSound] = useState(null);
    const [playingMessageId, setPlayingMessageId] = useState(null);

    // Photo editor states
    const [showPhotoEditor, setShowPhotoEditor] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState(null);
    const [editActions, setEditActions] = useState([]);

    const flatListRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        // Set active chat when entering room
        const setActiveChatId = async () => {
            try {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    activeChatId: chatId,
                    lastActiveAt: serverTimestamp()
                });
            } catch (error) {
                // Handle error silently
            }
        };
        setActiveChatId();

        // Listen to messages
        const unsubscribe = chatService.listenToMessages(chatId, (msgs) => {
            setMessages(msgs);
            setLoading(false);
        }, currentUser.uid);

        // Mark messages as read in chat list
        chatService.markAsRead(chatId, currentUser.uid);

        // Mark individual messages as seen
        chatService.markMessagesAsSeen(chatId, currentUser.uid);

        // Get user balance
        loadUserBalance();

        // Check block/mute status
        checkBlockMuteStatus();

        return () => {
            unsubscribe();
            // Clear active chat when leaving room
            updateDoc(doc(db, 'users', currentUser.uid), {
                activeChatId: null
            }).catch(() => {});

            // Stop any playing audio
            if (playingSound) {
                playingSound.unloadAsync();
            }
        };
    }, [chatId]);

    // Listen to other user's online status and last seen
    useEffect(() => {
        if (!otherUser?.id) return;

        const userRef = doc(db, 'users', otherUser.id);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setOtherUserData({ id: docSnap.id, ...docSnap.data() });
            }
        });

        return () => unsubscribe();
    }, [otherUser?.id]);

    // Listen to typing status
    useEffect(() => {
        const unsubscribe = chatService.listenToTypingStatus(chatId, (typing) => {
            // Check if other user is typing (not current user)
            const otherUserId = otherUser?.id;
            if (otherUserId && typing[otherUserId]) {
                const typingTimestamp = typing[otherUserId];
                // Consider typing if timestamp is within last 3 seconds
                const now = new Date();
                const typingTime = typingTimestamp.toDate ? typingTimestamp.toDate() : new Date(typingTimestamp);
                const diff = now - typingTime;
                setIsOtherUserTyping(diff < 3000);
            } else {
                setIsOtherUserTyping(false);
            }
        });

        return () => {
            unsubscribe();
            // Clear typing timeout on unmount
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            // Clear typing status
            chatService.setTypingStatus(chatId, currentUser.uid, false);
        };
    }, [chatId, otherUser?.id]);

    const checkBlockMuteStatus = async () => {
        const blocked = await userService.isUserBlocked(currentUser.uid, otherUser.id);
        const muted = await userService.isUserMuted(currentUser.uid, otherUser.id);
        const blockedByOther = await userService.isUserBlocked(otherUser.id, currentUser.uid);
        setIsBlocked(blocked);
        setIsMuted(muted);
        setIsBlockedByOther(blockedByOther);
    };

    const loadUserBalance = async () => {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            setUserBalance(userDoc.data().balanceCoins || 0);
        }
    };

    const formatMessageTime = (date) => {
        if (!date) return '';

        if (isToday(date)) {
            return format(date, 'HH:mm');
        } else if (isYesterday(date)) {
            return `Yesterday ${format(date, 'HH:mm')}`;
        } else {
            return `${format(date, 'dd/MM/yyyy')} ${format(date, 'HH:mm')}`;
        }
    };

    const handleSend = async (retryMessage = null) => {
        const messageText = retryMessage || newMessage.trim();
        if (!messageText) return;

        // Check if blocked
        if (isBlocked) {
            Alert.alert('Cannot Send', 'You have blocked this user. Unblock them to send messages.');
            return;
        }

        // Check if we are blocked by the other user
        const isBlockedByOther = await userService.isUserBlocked(otherUser.id, currentUser.uid);
        if (isBlockedByOther) {
            Alert.alert('Cannot Send', 'You cannot send messages to this user.');
            return;
        }

        // Clear typing status
        chatService.setTypingStatus(chatId, currentUser.uid, false);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Handle editing
        if (editingMessage) {
            setSending(true);
            const result = await chatService.editMessage(editingMessage.id, messageText);
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
        if (!retryMessage) setNewMessage('');

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
            // Show retry option
            Alert.alert(
                'Send Failed',
                result.error,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Retry',
                        onPress: () => handleSend(messageText)
                    }
                ]
            );
            if (!retryMessage) setNewMessage(messageText);
        } else {
            setUserBalance(prev => prev - 1);
        }
    };

    // Voice Message Functions
    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'We need microphone permission to record voice messages');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);
            setRecordingDuration(0);

            // Update duration every second
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            Alert.alert('Error', 'Failed to start recording');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            setIsRecording(false);
            setRecording(null);

            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }

            if (recordingDuration < 1) {
                Alert.alert('Too Short', 'Voice message is too short');
                setRecordingDuration(0);
                return;
            }

            // Send voice message
            if (uri) {
                await sendVoiceMessage(uri);
            }

            setRecordingDuration(0);
        } catch (err) {
            Alert.alert('Error', 'Failed to stop recording');
        }
    };

    const cancelRecording = async () => {
        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            setIsRecording(false);
            setRecording(null);
            setRecordingDuration(0);

            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        } catch (err) {
            console.error('Error canceling recording:', err);
        }
    };

    const sendVoiceMessage = async (uri) => {
        // Check if blocked
        if (isBlocked) {
            Alert.alert('Cannot Send', 'You have blocked this user. Unblock them to send messages.');
            return;
        }

        const isBlockedByOther = await userService.isUserBlocked(otherUser.id, currentUser.uid);
        if (isBlockedByOther) {
            Alert.alert('Cannot Send', 'You cannot send messages to this user.');
            return;
        }

        if (userBalance < 1) {
            Alert.alert('Insufficient Coins', 'You need at least 1 coin to send a voice message');
            return;
        }

        setSending(true);
        const result = await chatService.sendMediaMessage(
            chatId,
            currentUser.uid,
            otherUser.id,
            uri,
            'audio'
        );
        setSending(false);

        if (!result.success) {
            Alert.alert('Error', result.error);
        } else {
            setUserBalance(prev => prev - 1);
        }
    };

    const playVoiceMessage = async (messageId, audioUrl) => {
        try {
            // Stop current playing sound if any
            if (playingSound) {
                await playingSound.unloadAsync();
                setPlayingSound(null);
                setPlayingMessageId(null);
            }

            // If same message, just stop
            if (playingMessageId === messageId) {
                return;
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true }
            );

            setPlayingSound(sound);
            setPlayingMessageId(messageId);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setPlayingMessageId(null);
                    setPlayingSound(null);
                    sound.unloadAsync();
                }
            });

        } catch (err) {
            Alert.alert('Error', 'Failed to play voice message');
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Photo Editor Functions
    const openPhotoEditor = (imageUri) => {
        setEditingPhoto(imageUri);
        setEditActions([]);
        setShowPhotoEditor(true);
    };

    const applyPhotoEdits = async () => {
        if (!editingPhoto) return;

        try {
            let manipResult = await ImageManipulator.manipulateAsync(
                editingPhoto,
                editActions,
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            setShowPhotoEditor(false);

            // Send the edited photo
            if (userBalance < 1) {
                Alert.alert('Insufficient Coins', 'You need at least 1 coin to send media');
                return;
            }

            setSending(true);
            const sendResult = await chatService.sendMediaMessage(
                chatId,
                currentUser.uid,
                otherUser.id,
                manipResult.uri,
                'image'
            );
            setSending(false);

            if (!sendResult.success) {
                Alert.alert('Error', sendResult.error);
            } else {
                setUserBalance(prev => prev - 1);
            }

            setEditingPhoto(null);
            setEditActions([]);
        } catch (err) {
            Alert.alert('Error', 'Failed to edit photo');
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
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled) {
            // Ask if user wants to edit before sending
            Alert.alert(
                'Send Photo',
                'Would you like to edit this photo before sending?',
                [
                    {
                        text: 'Send Now',
                        onPress: () => sendImage(result.assets[0].uri)
                    },
                    {
                        text: 'Edit',
                        onPress: () => openPhotoEditor(result.assets[0].uri)
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    };

    const sendImage = async (imageUri) => {
        // Check if blocked
        if (isBlocked) {
            Alert.alert('Cannot Send', 'You have blocked this user. Unblock them to send messages.');
            return;
        }

        const isBlockedByOther = await userService.isUserBlocked(otherUser.id, currentUser.uid);
        if (isBlockedByOther) {
            Alert.alert('Cannot Send', 'You cannot send messages to this user.');
            return;
        }

        if (userBalance < 1) {
            Alert.alert('Insufficient Coins', 'You need at least 1 coin to send media');
            return;
        }

        setSending(true);

        try {
            let uri = imageUri;

            // Convert HEIC/HEIF to JPEG if needed
            if (uri.toLowerCase().endsWith('.heic') ||
                uri.toLowerCase().endsWith('.heif')) {
                const manipResult = await ImageManipulator.manipulateAsync(
                    uri,
                    [],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                uri = manipResult.uri;
            }

            const sendResult = await chatService.sendMediaMessage(
                chatId,
                currentUser.uid,
                otherUser.id,
                uri,
                'image'
            );

            if (!sendResult.success) {
                Alert.alert('Error', sendResult.error);
            } else {
                setUserBalance(prev => prev - 1);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to send image');
        } finally {
            setSending(false);
        }
    };

    const handleVideoPick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need permission to access your videos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
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
            // Ask if user wants to edit before sending
            Alert.alert(
                'Send Photo',
                'Would you like to edit this photo before sending?',
                [
                    {
                        text: 'Send Now',
                        onPress: () => sendImage(result.assets[0].uri)
                    },
                    {
                        text: 'Edit',
                        onPress: () => openPhotoEditor(result.assets[0].uri)
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    };

    const handleGIFPicker = () => {
        // Simple GIF picker with predefined GIFs (in a real app, use GIPHY API)
        const popularGIFs = [
            { name: '👍 Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
            { name: '😂 Laughing', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif' },
            { name: '❤️ Heart', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWR5NzJpZXdhNWY1cXhub2hvcm52dXppcm50ZWN5bWw0MmwxZXUzaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/M90mJvfWfd5mbUuULX/giphy.gif' },
            { name: '🎉 Party', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif' },
            { name: '😴 Sleeping', url: 'https://media.giphy.com/media/krP2NRkLqnKEg/giphy.gif' },
            { name: '🤔 Thinking', url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif' },
        ];

        Alert.alert(
            'Send GIF',
            'Choose a GIF',
            [
                ...popularGIFs.map(gif => ({
                    text: gif.name,
                    onPress: () => sendGIF(gif.url)
                })),
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const sendGIF = async (gifUrl) => {
        // Check if blocked
        if (isBlocked) {
            Alert.alert('Cannot Send', 'You have blocked this user. Unblock them to send messages.');
            return;
        }

        const isBlockedByOther = await userService.isUserBlocked(otherUser.id, currentUser.uid);
        if (isBlockedByOther) {
            Alert.alert('Cannot Send', 'You cannot send messages to this user.');
            return;
        }

        if (userBalance < 1) {
            Alert.alert('Insufficient Coins', 'You need at least 1 coin to send a GIF');
            return;
        }

        setSending(true);
        const result = await chatService.sendMediaMessage(
            chatId,
            currentUser.uid,
            otherUser.id,
            gifUrl,
            'image'
        );
        setSending(false);

        if (!result.success) {
            Alert.alert('Error', result.error);
        } else {
            setUserBalance(prev => prev - 1);
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
                { text: 'Send GIF', onPress: handleGIFPicker },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleCall = async (callType) => {
        if (isBlocked || isBlockedByOther) {
            Alert.alert('Cannot Call', 'You cannot call this user');
            return;
        }

        try {
            const result = await callService.initiateCall(
                currentUser.uid,
                otherUser.id,
                callType
            );

            if (result.success) {
                navigation.navigate('OutgoingCall', {
                    callId: result.callId,
                    receiver: otherUserData,
                    callType
                });
            } else {
                Alert.alert('Error', 'Failed to start call');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to start call');
        }
    };

    const handleUserOptions = () => {
        Alert.alert(
            otherUserData.displayName,
            'User Options',
            [
                {
                    text: 'View Profile',
                    onPress: () => navigation.navigate('Profile', { userId: otherUser.id })
                },
                {
                    text: isBlocked ? 'Unblock User' : 'Block User',
                    onPress: () => handleBlockToggle()
                },
                {
                    text: isMuted ? 'Unmute User' : 'Mute User',
                    onPress: () => handleMuteToggle()
                },
                {
                    text: 'Report User',
                    style: 'destructive',
                    onPress: () => handleReport()
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleBlockToggle = async () => {
        const result = isBlocked
            ? await userService.unblockUser(currentUser.uid, otherUser.id)
            : await userService.blockUser(currentUser.uid, otherUser.id);

        if (result.success) {
            setIsBlocked(!isBlocked);
            Alert.alert('Success', isBlocked ? 'User unblocked' : 'User blocked');
        } else {
            Alert.alert('Error', result.error);
        }
    };

    const handleMuteToggle = async () => {
        const result = isMuted
            ? await userService.unmuteUser(currentUser.uid, otherUser.id)
            : await userService.muteUser(currentUser.uid, otherUser.id);

        if (result.success) {
            setIsMuted(!isMuted);
            Alert.alert('Success', isMuted ? 'User unmuted' : 'User muted');
        } else {
            Alert.alert('Error', result.error);
        }
    };

    const handleReport = () => {
        Alert.prompt(
            'Report User',
            'Please provide a reason for reporting this user:',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit',
                    onPress: async (reason) => {
                        if (!reason || !reason.trim()) {
                            Alert.alert('Error', 'Please provide a reason');
                            return;
                        }

                        const result = await userService.reportUser(
                            currentUser.uid,
                            otherUser.id,
                            reason.trim()
                        );

                        if (result.success) {
                            Alert.alert('Success', 'User reported. Thank you for helping keep our community safe.');
                        } else {
                            Alert.alert('Error', result.error);
                        }
                    }
                }
            ],
            'plain-text'
        );
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.senderId === currentUser.uid;
        const messageTime = item.timestamp?.toDate?.();
        const hasMedia = item.mediaUrl && item.mediaType;
        const isVoiceMessage = item.mediaType === 'audio';
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
                                        {item.replyTo.mediaType
                                            ? `${item.replyTo.mediaType === 'image' ? '📷 Photo' : item.replyTo.mediaType === 'video' ? '🎥 Video' : item.replyTo.mediaType === 'audio' ? '🎤 Voice message' : '📄 Document'}`
                                            : item.replyTo.message || 'Message'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Message Content */}
                        {isVoiceMessage ? (
                            <TouchableOpacity
                                style={styles.voiceMessageContainer}
                                onPress={() => playVoiceMessage(item.id, item.mediaUrl)}
                            >
                                <Icon
                                    name={playingMessageId === item.id ? "pause-circle" : "play-circle"}
                                    size={32}
                                    color={isMyMessage ? "#fff" : "#6C5CE7"}
                                />
                                <View style={styles.voiceWaveform}>
                                    <View style={styles.waveBar} />
                                    <View style={[styles.waveBar, styles.waveBarTall]} />
                                    <View style={styles.waveBar} />
                                    <View style={[styles.waveBar, styles.waveBarTall]} />
                                    <View style={styles.waveBar} />
                                    <View style={[styles.waveBar, styles.waveBarShort]} />
                                    <View style={[styles.waveBar, styles.waveBarTall]} />
                                    <View style={styles.waveBar} />
                                </View>
                                <Text style={[
                                    styles.voiceDuration,
                                    isMyMessage ? styles.myMessageText : styles.theirMessageText
                                ]}>
                                    {playingMessageId === item.id ? '⏸' : '🎤'}
                                </Text>
                            </TouchableOpacity>
                        ) : hasMedia ? (
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
                        <View style={styles.timeRow}>
                            <Text style={[
                                styles.messageTime,
                                isMyMessage ? styles.myMessageTime : styles.theirMessageTime
                            ]}>
                                {messageTime ? formatMessageTime(messageTime) : ''}
                                {item.edited && ' (edited)'}
                            </Text>
                            {isMyMessage && (
                                <Text style={[
                                    styles.seenIndicator,
                                    item.read && styles.seenIndicatorRead
                                ]}>
                                    {item.read ? '✓✓' : '✓'}
                                </Text>
                            )}
                        </View>
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

                <TouchableOpacity
                    style={styles.headerCenter}
                    onPress={() => navigation.navigate('Profile', { userId: otherUser.id })}
                >
                    {otherUserData.photoURL ? (
                        <Image source={{ uri: otherUserData.photoURL }} style={styles.headerAvatar} />
                    ) : (
                        <View style={styles.headerAvatarPlaceholder}>
                            <Text style={styles.headerAvatarText}>{getInitials(otherUserData.displayName)}</Text>
                        </View>
                    )}
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{otherUserData.displayName}</Text>
                        <Text style={[
                            styles.headerStatus,
                            isOtherUserTyping && styles.typingStatus
                        ]}>
                            {isOtherUserTyping ? (
                                'typing...'
                            ) : otherUserData.isOnline ? (
                                'Online'
                            ) : otherUserData.lastSeen?.toDate ? (
                                `Last seen ${formatDistanceToNow(otherUserData.lastSeen.toDate(), { addSuffix: true })}`
                            ) : (
                                'Offline'
                            )}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => handleCall('video')} style={styles.callButton}>
                        <Icon name="videocam" size={22} color="#6C5CE7" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleCall('audio')} style={styles.callButton}>
                        <Icon name="call" size={22} color="#6C5CE7" />
                    </TouchableOpacity>
                    <Text style={styles.coinsText}>{userBalance} 💰</Text>
                    <TouchableOpacity onPress={handleUserOptions} style={styles.menuButton}>
                        <Icon name="ellipsis-vertical" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Messages List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6C5CE7" />
                    <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
            ) : messages.length === 0 ? (
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
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    initialNumToRender={15}
                />
            )}

            {/* Sending indicator */}
            {sending && (
                <View style={styles.sendingIndicator}>
                    <ActivityIndicator color="#6C5CE7" />
                    <Text style={styles.sendingText}>Sending...</Text>
                </View>
            )}

            {/* Recording indicator */}
            {isRecording && (
                <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>Recording... {formatDuration(recordingDuration)}</Text>
                    <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordButton}>
                        <Text style={styles.cancelRecordText}>Cancel</Text>
                    </TouchableOpacity>
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
                                {editingMessage
                                    ? editingMessage.message
                                    : replyingTo?.mediaType
                                        ? `${replyingTo.mediaType === 'image' ? '📷 Photo' : replyingTo.mediaType === 'video' ? '🎥 Video' : replyingTo.mediaType === 'audio' ? '🎤 Voice message' : '📄 Document'}`
                                        : replyingTo?.message || 'Message'}
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

            {/* Typing Indicator */}
            {isOtherUserTyping && (
                <View style={styles.typingIndicator}>
                    <Text style={styles.typingText}>{otherUserData.displayName} is typing...</Text>
                </View>
            )}

            {/* Input Bar */}
            {isBlocked || isBlockedByOther ? (
                <View style={styles.blockedInputContainer}>
                    <Icon name="ban-outline" size={20} color="#888" />
                    <Text style={styles.blockedInputText}>
                        {isBlocked
                            ? "You have blocked this user. Unblock to send messages."
                            : "You cannot send messages to this user."}
                    </Text>
                </View>
            ) : (
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
                        onChangeText={(text) => {
                            setNewMessage(text);

                            // Set typing status
                            if (text.length > 0) {
                                chatService.setTypingStatus(chatId, currentUser.uid, true);

                                // Clear existing timeout
                                if (typingTimeoutRef.current) {
                                    clearTimeout(typingTimeoutRef.current);
                                }

                                // Set timeout to clear typing status after 3 seconds
                                typingTimeoutRef.current = setTimeout(() => {
                                    chatService.setTypingStatus(chatId, currentUser.uid, false);
                                }, 3000);
                            } else {
                                chatService.setTypingStatus(chatId, currentUser.uid, false);
                            }
                        }}
                        multiline
                        maxLength={500}
                        editable={!sending && !isRecording}
                    />

                    {/* Voice Message Button (when no text) */}
                    {!newMessage.trim() && !editingMessage && (
                        <TouchableOpacity
                            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                            disabled={sending}
                        >
                            <Icon name="mic" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {/* Send Button (when has text) */}
                    {(newMessage.trim() || editingMessage) && (
                        <TouchableOpacity
                            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                            onPress={() => handleSend()}
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
                    )}
                </View>
            )}

            {/* Photo Editor Modal */}
            <Modal
                visible={showPhotoEditor}
                transparent={false}
                animationType="slide"
            >
                <View style={styles.editorContainer}>
                    <View style={styles.editorHeader}>
                        <TouchableOpacity onPress={() => setShowPhotoEditor(false)}>
                            <Text style={styles.editorCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.editorTitle}>Edit Photo</Text>
                        <TouchableOpacity onPress={applyPhotoEdits}>
                            <Text style={styles.editorDone}>Send</Text>
                        </TouchableOpacity>
                    </View>

                    {editingPhoto && (
                        <Image
                            source={{ uri: editingPhoto }}
                            style={styles.editorImage}
                            resizeMode="contain"
                        />
                    )}

                    <View style={styles.editorTools}>
                        <TouchableOpacity
                            style={styles.editorTool}
                            onPress={() => {
                                setEditActions([...editActions, { rotate: 90 }]);
                            }}
                        >
                            <Icon name="refresh" size={24} color="#fff" />
                            <Text style={styles.editorToolText}>Rotate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.editorTool}
                            onPress={() => {
                                setEditActions([...editActions, { flip: ImageManipulator.FlipType.Horizontal }]);
                            }}
                        >
                            <Icon name="swap-horizontal" size={24} color="#fff" />
                            <Text style={styles.editorToolText}>Flip</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.editorTool}
                            onPress={() => {
                                setEditActions([...editActions, {
                                    crop: {
                                        originX: 0,
                                        originY: 0,
                                        width: 800,
                                        height: 800
                                    }
                                }]);
                            }}
                        >
                            <Icon name="crop" size={24} color="#fff" />
                            <Text style={styles.editorToolText}>Square</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        flex: 1,
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
    typingStatus: {
        color: '#6C5CE7',
        fontStyle: 'italic',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    callButton: {
        padding: 6,
    },
    coinsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFD700',
    },
    menuButton: {
        marginTop: 4,
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
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    messageTime: {
        fontSize: 10,
    },
    myMessageTime: {
        color: '#E0E0E0',
    },
    theirMessageTime: {
        color: '#888',
    },
    seenIndicator: {
        fontSize: 10,
        marginLeft: 4,
        color: '#888',
    },
    seenIndicatorRead: {
        color: '#4A9EFF',
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
    blockedInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#2A2A2A',
        borderTopWidth: 1,
        borderTopColor: '#333',
        gap: 10,
    },
    blockedInputText: {
        color: '#888',
        fontSize: 13,
        textAlign: 'center',
        flex: 1,
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
    voiceButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceButtonRecording: {
        backgroundColor: '#FF4444',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        fontSize: 14,
        marginTop: 15,
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
    typingIndicator: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#2A2A2A',
    },
    typingText: {
        color: '#888',
        fontSize: 13,
        fontStyle: 'italic',
    },
    mediaBubble: {
        padding: 4,
    },
    mediaPreview: {
        width: 200,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#333',
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
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#FF4444',
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#fff',
        marginRight: 10,
    },
    recordingText: {
        color: '#fff',
        fontSize: 14,
        flex: 1,
        fontWeight: '600',
    },
    cancelRecordButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#fff',
        borderRadius: 8,
    },
    cancelRecordText: {
        color: '#FF4444',
        fontSize: 12,
        fontWeight: '600',
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
    voiceMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    voiceWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        flex: 1,
    },
    waveBar: {
        width: 3,
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.5)',
        marginHorizontal: 2,
        borderRadius: 2,
    },
    waveBarTall: {
        height: 24,
    },
    waveBarShort: {
        height: 10,
    },
    voiceDuration: {
        fontSize: 14,
        marginLeft: 8,
    },
    editorContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    editorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#1A1A1A',
    },
    editorCancel: {
        color: '#888',
        fontSize: 16,
    },
    editorTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    editorDone: {
        color: '#6C5CE7',
        fontSize: 16,
        fontWeight: '600',
    },
    editorImage: {
        flex: 1,
        width: SCREEN_WIDTH,
    },
    editorTools: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        backgroundColor: '#1A1A1A',
    },
    editorTool: {
        alignItems: 'center',
        padding: 10,
    },
    editorToolText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 5,
    },
});
