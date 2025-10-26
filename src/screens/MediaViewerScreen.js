import { VideoView, useVideoPlayer } from 'expo-video';
import { useState } from 'react';
import {
    Dimensions,
    Image,
    Platform,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

export default function MediaViewerScreen({ route, navigation }) {
    const { mediaUrl, mediaType } = route.params;
    const [isPlaying, setIsPlaying] = useState(false);
    
 
    
    // Create video player only for video type
    const player = mediaType === 'video' 
        ? useVideoPlayer(mediaUrl, player => {
            player.loop = true;
          })
        : null;

    const handlePlayPause = () => {
        if (player) {
            if (isPlaying) {
                player.pause();
            } else {
                player.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="close" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Media Content */}
            <View style={styles.mediaContainer}>
                {mediaType === 'image' ? (
                    <Image
                        source={{ uri: mediaUrl }}
                        style={styles.fullImage}
                        resizeMode="contain"
                        
                    />
                ) : (
                    <>
                        <VideoView
                            style={styles.fullVideo}
                            player={player}
                            allowsFullscreen={false}
                            allowsPictureInPicture={false}
                            nativeControls={false}
                        />
                        
                        {/* Video Controls */}
                        <TouchableOpacity
                            style={styles.videoControls}
                            onPress={handlePlayPause}
                        >
                            <Icon
                                name={isPlaying ? 'pause-circle' : 'play-circle'}
                                size={70}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 15,
        paddingBottom: 15,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: width,
        height: height,
    },
    fullVideo: {
        width: width,
        height: height,
    },
    videoControls: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -35,
        marginLeft: -35,
    },
});