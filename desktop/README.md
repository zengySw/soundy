# Soundy Desktop Widget (Tauri v2 + React)

## Run

```bash
npm install
npm run tauri dev
```

## Window

- size: `320x120`
- `alwaysOnTop: true`
- `decorations: false`
- `transparent: true`

## WebSocket bridge

Default URL: `ws://127.0.0.1:32123`  
Override with env: `VITE_WIDGET_WS_URL`.

### Incoming state message

```json
{
  "type": "player_state",
  "payload": {
    "track_id": "abc",
    "title": "Track",
    "artist": "Artist",
    "cover_url": "https://...",
    "duration_sec": 215,
    "current_time_sec": 57,
    "is_playing": true
  }
}
```

### Outgoing control message

```json
{
  "type": "player_command",
  "command": "play_pause"
}
```

Possible `command`: `prev`, `play_pause`, `next`, `seek`  
For seek:

```json
{
  "type": "player_command",
  "command": "seek",
  "payload": { "position_sec": 72.4 }
}
```
