import React from 'react';
import VideoTile from './VideoTile';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';

export default function VideoGrid({ getPeerConnection }) {
  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    screenStream,
    peers,
    isHost,
    activeSpeakerId,
  } = useRoomStore();

  const { user } = useAuthStore();
  const peerList = Object.values(peers);

  // Total tiles = local (or screen share) + peers
  const totalCount = 1 + (isScreenSharing ? 1 : 0) + peerList.length;

  // Responsive grid class determination
  const getGridClasses = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-4xl mx-auto h-full max-h-[75vh]';
    if (totalCount === 2) return 'grid-cols-1 sm:grid-cols-2 h-full max-h-[75vh]';
    if (totalCount <= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 h-full max-h-[78vh]';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 h-full max-h-[80vh]';
  };

  const localName = user?.name || 'You';

  return (
    <div className="flex-1 w-full p-4 flex items-center justify-center overflow-hidden">
      <div className={`w-full grid gap-3 sm:gap-4 ${getGridClasses()}`}>
        {/* Local Stream Video Tile */}
        <div className="w-full h-full min-h-[220px]">
          <VideoTile
            stream={localStream}
            name={localName}
            isLocal={true}
            isAudioMuted={!isAudioEnabled}
            isVideoMuted={!isVideoEnabled}
            isHost={isHost}
            isSpeaking={activeSpeakerId === 'local'}
          />
        </div>

        {/* Local Screen Share Tile if Active */}
        {isScreenSharing && screenStream && (
          <div className="w-full h-full min-h-[220px]">
            <VideoTile
              stream={screenStream}
              name={`${localName}'s Screen`}
              isLocal={true}
              isAudioMuted={true}
              isVideoMuted={false}
              isScreenShare={true}
            />
          </div>
        )}

        {/* Remote Peer Video Tiles */}
        {peerList.map((peer) => (
          <div key={peer.socketId} className="w-full h-full min-h-[220px]">
            <VideoTile
              stream={peer.stream}
              name={peer.name || 'Participant'}
              isLocal={false}
              isAudioMuted={peer.audio === false}
              isVideoMuted={peer.video === false || !peer.stream}
              isHost={peer.isHost}
              connectionState={peer.connectionState || 'connected'}
              isScreenShare={peer.screen}
              isSpeaking={activeSpeakerId === peer.socketId}
              pc={getPeerConnection ? getPeerConnection(peer.socketId) : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
