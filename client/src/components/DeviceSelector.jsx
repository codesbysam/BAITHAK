import React from 'react';
import { useRoomStore } from '../store/roomStore';

export default function DeviceSelector({ onDeviceChange }) {
  const {
    audioDevices,
    videoDevices,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    setSelectedAudioDeviceId,
    setSelectedVideoDeviceId,
  } = useRoomStore();

  const handleAudioChange = (e) => {
    const id = e.target.value;
    setSelectedAudioDeviceId(id);
    if (onDeviceChange) onDeviceChange({ audioDeviceId: id });
  };

  const handleVideoChange = (e) => {
    const id = e.target.value;
    setSelectedVideoDeviceId(id);
    if (onDeviceChange) onDeviceChange({ videoDeviceId: id });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">Microphone</label>
        <select
          value={selectedAudioDeviceId}
          onChange={handleAudioChange}
          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {audioDevices.length === 0 ? (
            <option value="">Default Microphone</option>
          ) : (
            audioDevices.map((d, index) => (
              <option key={d.deviceId || index} value={d.deviceId}>
                {d.label || `Microphone ${index + 1}`}
              </option>
            ))
          )}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">Camera</label>
        <select
          value={selectedVideoDeviceId}
          onChange={handleVideoChange}
          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {videoDevices.length === 0 ? (
            <option value="">Default Camera</option>
          ) : (
            videoDevices.map((d, index) => (
              <option key={d.deviceId || index} value={d.deviceId}>
                {d.label || `Camera ${index + 1}`}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
