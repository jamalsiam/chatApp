import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from '../services/authService';
import callService from '../services/callService';
import userService from '../services/userService';

export default function CallsScreen({ navigation }) {
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const calls = await callService.getCallHistory(currentUser.uid);

      // Load user info for each call
      const callsWithUserInfo = await Promise.all(
        calls.map(async (call) => {
          const otherUserId = call.callerId === currentUser.uid
            ? call.receiverId
            : call.callerId;
          const otherUser = await userService.getUserProfile(otherUserId);
          return { ...call, otherUser };
        })
      );

      setCallHistory(callsWithUserInfo);
    } catch (error) {
      console.error('Error loading call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCallTime = (timestamp) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call) => {
    const isIncoming = call.receiverId === currentUser.uid;
    const isOutgoing = call.callerId === currentUser.uid;

    if (call.status === 'missed') {
      return { name: 'call-outline', color: '#FF4757' };
    } else if (isOutgoing) {
      return { name: 'arrow-up', color: '#00D856' };
    } else if (isIncoming) {
      return { name: 'arrow-down', color: '#00D856' };
    }
    return { name: 'call-outline', color: '#888' };
  };

  const getCallStatusText = (call) => {
    const isIncoming = call.receiverId === currentUser.uid;

    switch (call.status) {
      case 'missed':
        return 'Missed';
      case 'declined':
        return isIncoming ? 'Declined' : 'Unavailable';
      case 'ended':
        return formatDuration(call.duration);
      default:
        return call.status;
    }
  };

  const handleCallPress = async (call) => {
    const result = await callService.initiateCall(
      currentUser.uid,
      call.otherUser.id,
      call.callType
    );

    if (result.success) {
      navigation.navigate('OutgoingCall', {
        callId: result.callId,
        receiver: call.otherUser,
        callType: call.callType
      });
    }
  };

  const renderCallItem = ({ item: call }) => {
    const icon = getCallIcon(call);
    const statusText = getCallStatusText(call);

    return (
      <TouchableOpacity
        style={styles.callItem}
        onPress={() => handleCallPress(call)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {call.otherUser?.photoURL ? (
            <Image
              source={{ uri: call.otherUser.photoURL }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={24} color="#888" />
            </View>
          )}
        </View>

        <View style={styles.callInfo}>
          <Text style={styles.userName}>
            {call.otherUser?.displayName || 'Unknown'}
          </Text>
          <View style={styles.callDetailsRow}>
            <Icon
              name={icon.name}
              size={16}
              color={icon.color}
              style={styles.callIcon}
            />
            <Icon
              name={call.callType === 'video' ? 'videocam' : 'call'}
              size={14}
              color="#888"
              style={styles.callTypeIcon}
            />
            <Text style={[
              styles.callStatus,
              call.status === 'missed' && styles.missedCallStatus
            ]}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatCallTime(call.startTime)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calls</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
      </View>

      {callHistory.length === 0 ? (
        <View style={styles.content}>
          <Icon name="call-outline" size={80} color="#444" />
          <Text style={styles.emptyText}>No call history</Text>
          <Text style={styles.emptySubtext}>Make your first call</Text>
        </View>
      ) : (
        <FlatList
          data={callHistory}
          renderItem={renderCallItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 8,
  },
  avatarContainer: {
    marginRight: 12,
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
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  callDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIcon: {
    marginRight: 6,
  },
  callTypeIcon: {
    marginRight: 4,
  },
  callStatus: {
    fontSize: 14,
    color: '#888',
  },
  missedCallStatus: {
    color: '#FF4757',
  },
  timeContainer: {
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
});