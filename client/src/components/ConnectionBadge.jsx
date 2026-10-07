import React, { useState, useEffect } from 'react';

/**
 * Calculates real-time connection quality using RTCPeerConnection.getStats().
 * Evaluates round-trip time (RTT), packet loss percentage, and bitrate.
 */
function useConnectionStats(pc) {
  const [stats, setStats] = useState({
    quality: 'good', // 'good' | 'fair' | 'poor'
    rtt: 0,
    packetLoss: 0,
    bitrate: 0,
  });

  useEffect(() => {
    if (!pc) return;

    let prevBytes = 0;
    let prevTimestamp = Date.now();

    const interval = setInterval(async () => {
      try {
        if (pc.connectionState === 'closed' || pc.signalingState === 'closed') {
          return;
        }

        const reports = await pc.getStats();
        let rtt = 0;
        let packetsLost = 0;
        let packetsReceived = 0;
        let currentBytes = 0;

        reports.forEach((report) => {
          // Candidate pair for round trip time
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
          }

          // Inbound RTP for packet loss and bitrate
          if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
            currentBytes += report.bytesReceived || 0;
          }
        });

        const now = Date.now();
        const timeDiff = (now - prevTimestamp) / 1000;
        const bitrate = timeDiff > 0 ? Math.round(((currentBytes - prevBytes) * 8) / (1000 * timeDiff)) : 0;

        prevBytes = currentBytes;
        prevTimestamp = now;

        const totalPackets = packetsLost + packetsReceived;
        const lossPercent = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

        let quality = 'good';
        if (rtt > 300 || lossPercent > 5) {
          quality = 'poor';
        } else if (rtt > 150 || lossPercent > 2) {
          quality = 'fair';
        }

        setStats({
          quality,
          rtt,
          packetLoss: Math.round(lossPercent * 10) / 10,
          bitrate,
        });
      } catch {
        // Suppress errors during connection teardown
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [pc]);

  return stats;
}

export default function ConnectionBadge({ pc }) {
  const { quality, rtt, packetLoss, bitrate } = useConnectionStats(pc);
  const [showTooltip, setShowTooltip] = useState(false);

  const colors = {
    good: 'bg-emerald-500 text-emerald-400',
    fair: 'bg-amber-500 text-amber-400',
    poor: 'bg-red-500 text-red-400',
  };

  return (
    <div
      className="relative cursor-pointer pointer-events-auto"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 3-bar signal icon */}
      <div className="flex items-end gap-0.5 h-3.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
        <span className={`w-1 h-1.5 rounded-xs ${quality === 'poor' || quality === 'fair' || quality === 'good' ? colors[quality].split(' ')[0] : 'bg-slate-600'}`} />
        <span className={`w-1 h-2.5 rounded-xs ${quality === 'fair' || quality === 'good' ? colors[quality].split(' ')[0] : 'bg-slate-600'}`} />
        <span className={`w-1 h-3.5 rounded-xs ${quality === 'good' ? colors[quality].split(' ')[0] : 'bg-slate-600'}`} />
      </div>

      {/* Tooltip with detailed WebRTC stats */}
      {showTooltip && (
        <div className="absolute top-6 right-0 z-50 w-36 p-2 rounded-xl bg-slate-900/95 border border-slate-800 text-[10px] text-slate-300 shadow-xl backdrop-blur-md pointer-events-none">
          <div className="font-semibold text-white mb-1 flex items-center justify-between">
            <span>Network</span>
            <span className={`capitalize ${colors[quality].split(' ')[1]}`}>{quality}</span>
          </div>
          <div className="space-y-0.5 text-slate-400">
            <p>RTT: <span className="text-white">{rtt}ms</span></p>
            <p>Loss: <span className="text-white">{packetLoss}%</span></p>
            <p>Bitrate: <span className="text-white">{bitrate} kbps</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
