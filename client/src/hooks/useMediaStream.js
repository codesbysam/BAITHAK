import { useState, useCallback, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';

export function useMediaStream() {
  const {
    localStream,
    setLocalStream,
    isAudioEnabled,
    isVideoEnabled,
    setDevices,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    setSelectedAudioDeviceId,
    setSelectedVideoDeviceId,
  } = useRoomStore();

  const [permissionError, setPermissionError] = useState(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Enumerate input devices
  const updateDeviceList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter((d) => d.kind === 'audioinput');
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      setDevices({ audioDevices, videoDevices });

      if (audioDevices.length > 0 && !selectedAudioDeviceId) {
        setSelectedAudioDeviceId(audioDevices[0].deviceId);
      }
      if (videoDevices.length > 0 && !selectedVideoDeviceId) {
        setSelectedVideoDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate media devices:', err);
    }
  }, [selectedAudioDeviceId, selectedVideoDeviceId, setDevices, setSelectedAudioDeviceId, setSelectedVideoDeviceId]);

  // Request user media stream
  const startMediaStream = useCallback(
    async (options = {}) => {
      setIsLoadingMedia(true);
      setPermissionError(null);

      const audioConstraint = options.audio !== false
        ? options.audioDeviceId
          ? { deviceId: { exact: options.audioDeviceId } }
          : true
        : false;

      const videoConstraint = options.video !== false
        ? options.videoDeviceId
          ? { deviceId: { exact: options.videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } }
        : false;

      try {
        // If an existing stream is present, stop its tracks before re-acquiring
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: videoConstraint,
        });

        // Sync track enablement with current store state
        stream.getAudioTracks().forEach((t) => {
          t.enabled = isAudioEnabled;
        });
        stream.getVideoTracks().forEach((t) => {
          t.enabled = isVideoEnabled;
        });

        setLocalStream(stream);
        await updateDeviceList();
        setIsLoadingMedia(false);
        return stream;
      } catch (err) {
        console.warn('getUserMedia error:', err.name, err.message);

        let friendlyMessage = 'Unable to access your camera or microphone.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          friendlyMessage = 'Camera/Microphone permission was denied. You can still join as a listen-only participant.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          friendlyMessage = 'No camera or microphone found on this device.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          friendlyMessage = 'Your camera or microphone is already in use by another application.';
        }

        setPermissionError(friendlyMessage);
        setIsLoadingMedia(false);

        // Create an empty fallback stream for listen-only mode
        const emptyStream = new MediaStream();
        setLocalStream(emptyStream);
        return emptyStream;
      }
    },
    [localStream, isAudioEnabled, isVideoEnabled, setLocalStream, updateDeviceList]
  );

  const stopMediaStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }, [localStream, setLocalStream]);

  // Listen for device changes (e.g. plugging in a USB webcam)
  useEffect(() => {
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', updateDeviceList);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', updateDeviceList);
      };
    }
  }, [updateDeviceList]);

  return {
    localStream,
    isLoadingMedia,
    permissionError,
    startMediaStream,
    stopMediaStream,
    updateDeviceList,
  };
}
