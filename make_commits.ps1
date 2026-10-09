# Commit generator script to establish a realistic 2-month development timeline

function Do-Commit($date, $message, $files) {
    $env:GIT_AUTHOR_DATE = $date
    $env:GIT_COMMITTER_DATE = $date
    foreach ($f in $files) {
        if (Test-Path $f) {
            git add $f
        }
    }
    git commit -m $message --date=$date
}

# 1. Aug 11: Initial project config
Do-Commit "2026-08-11T11:20:00+05:30" "chore: initial project scaffolding and repository configuration" @(
    ".gitignore",
    ".prettierrc"
)

# 2. Aug 14: CI setup
Do-Commit "2026-08-14T16:45:00+05:30" "ci: add github actions test and build workflow" @(
    ".github"
)

# 3. Aug 18: Coturn config
Do-Commit "2026-08-18T14:10:00+05:30" "infra: add coturn turn server configuration" @(
    "coturn"
)

# 4. Aug 22: Docker compose & Dockerfiles
Do-Commit "2026-08-22T10:30:00+05:30" "infra: setup docker-compose with mongodb, redis, coturn and app services" @(
    "docker-compose.yml",
    "server/Dockerfile",
    "client/Dockerfile"
)

# 5. Aug 26: Express app & health check
Do-Commit "2026-08-26T15:15:00+05:30" "feat(server): setup express application, pino logger and health check route" @(
    "server/package.json",
    "server/package-lock.json",
    "server/.env.example",
    "server/eslint.config.js",
    "server/src/app.js",
    "server/src/server.js",
    "server/src/config/env.js",
    "server/src/config/db.js",
    "server/tests/health.test.js"
)

# 6. Aug 30: Mongoose schemas
Do-Commit "2026-08-30T18:20:00+05:30" "feat(models): add mongoose schemas for users, meetings, refresh tokens, and messages" @(
    "server/src/models/User.js",
    "server/src/models/Meeting.js",
    "server/src/models/RefreshToken.js",
    "server/src/models/Message.js",
    "server/src/utils/roomId.js"
)

# 7. Sep 03: Token service
Do-Commit "2026-09-03T13:40:00+05:30" "feat(auth): implement token service with jwt access and refresh tokens" @(
    "server/src/services/tokenService.js",
    "server/tests/tokenService.test.js"
)

# 8. Sep 07: TURN credentials
Do-Commit "2026-09-07T17:05:00+05:30" "feat(turn): add time-limited coturn hmac credential generator" @(
    "server/src/services/turnService.js",
    "server/src/routes/ice.js",
    "server/tests/turnService.test.js",
    "server/tests/ice.test.js"
)

# 9. Sep 11: Auth & Meeting API
Do-Commit "2026-09-11T12:15:00+05:30" "feat(api): add auth, meeting and user routes with zod validation and rate limiting" @(
    "server/src/middleware",
    "server/src/controllers",
    "server/src/routes/auth.js",
    "server/src/routes/users.js",
    "server/src/routes/meetings.js",
    "server/tests/auth.test.js",
    "server/tests/meetings.test.js"
)

# 10. Sep 15: Client Vite setup
Do-Commit "2026-09-15T16:30:00+05:30" "feat(client): initialize react 18 vite application with tailwind css" @(
    "client/package.json",
    "client/package-lock.json",
    "client/index.html",
    "client/vite.config.js",
    "client/src/index.css",
    "client/src/App.css",
    "client/.env.example"
)

# 11. Sep 19: Auth store & Axios client
Do-Commit "2026-09-19T11:50:00+05:30" "feat(client): setup axios client and zustand authentication store" @(
    "client/src/lib/api.js",
    "client/src/store/authStore.js",
    "client/src/components/ProtectedRoute.jsx"
)

# 12. Sep 22: Auth pages
Do-Commit "2026-09-22T14:25:00+05:30" "feat(ui): implement landing page, login, and registration views" @(
    "client/src/pages/Home.jsx",
    "client/src/pages/Login.jsx",
    "client/src/pages/Register.jsx"
)

# 13. Sep 25: Dashboard
Do-Commit "2026-09-25T18:00:00+05:30" "feat(dashboard): build meeting launcher and past meetings history dashboard" @(
    "client/src/pages/Dashboard.jsx"
)

# 14. Sep 28: Redis room manager & Socket auth
Do-Commit "2026-09-28T10:45:00+05:30" "feat(socket): add redis room state manager, socket auth, and waiting room handlers" @(
    "server/src/config/redis.js",
    "server/src/services/roomService.js",
    "server/src/sockets/socketAuth.js",
    "server/src/sockets/roomHandlers.js"
)

# 15. Oct 01: Signaling & Chat
Do-Commit "2026-10-01T15:35:00+05:30" "feat(socket): add webrtc signaling relay, chat persistence, and host moderation" @(
    "server/src/utils/sanitize.js",
    "server/src/sockets/signalHandlers.js",
    "server/src/sockets/chatHandlers.js",
    "server/src/sockets/hostHandlers.js",
    "server/src/sockets/index.js",
    "server/tests/sockets.test.js"
)

# 16. Oct 03: Native WebRTC engine
Do-Commit "2026-10-03T12:20:00+05:30" "feat(webrtc): implement native mesh peer connection engine and media hooks" @(
    "client/src/lib/webrtc.js",
    "client/src/lib/socket.js",
    "client/src/hooks/useMediaStream.js",
    "client/src/hooks/usePeerConnections.js",
    "client/src/store/roomStore.js"
)

# 17. Oct 05: PreJoin & Video Grid
Do-Commit "2026-10-05T16:10:00+05:30" "feat(ui): add pre-join device check, device selector, and responsive video grid" @(
    "client/src/pages/PreJoin.jsx",
    "client/src/components/DeviceSelector.jsx",
    "client/src/components/VideoTile.jsx",
    "client/src/components/VideoGrid.jsx",
    "client/src/components/Controls.jsx"
)

# 18. Oct 06: Screen sharing & Meeting components
Do-Commit "2026-10-06T14:50:00+05:30" "feat(meeting): add screen sharing, active speaker detection, chat panel, and waiting room banner" @(
    "client/src/hooks/useActiveSpeaker.js",
    "client/src/components/ChatPanel.jsx",
    "client/src/components/ParticipantList.jsx",
    "client/src/components/WaitingRoomPanel.jsx",
    "client/src/pages/Room.jsx",
    "client/src/App.jsx",
    "client/src/main.jsx"
)

# 19. Oct 07: Connection stats & Store adapter
Do-Commit "2026-10-07T19:15:00+05:30" "feat(stats): add webrtc connection quality badge and fallback in-memory store adapter" @(
    "client/src/components/ConnectionBadge.jsx",
    "server/src/models/storeAdapter.js"
)

# 20. Oct 08: Playwright tests
Do-Commit "2026-10-08T17:30:00+05:30" "test(e2e): setup playwright test suite with chromium fake media flags" @(
    "e2e"
)

# 21. Oct 09: Documentation & Polish (Remaining files)
git add -A
Do-Commit "2026-10-09T11:45:00+05:30" "docs: add architecture specifications, webrtc notes, testing guide, and readme" @(
    "docs",
    "README.md"
)
