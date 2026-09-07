import json
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    """Maps user_id -> list of active WebSocket connections (multi-tab/device support)."""

    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        conns = self.active.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns and user_id in self.active:
            del self.active[user_id]

    def is_online(self, user_id: str) -> bool:
        return bool(self.active.get(user_id))

    async def send_to_user(self, user_id: str, payload: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                pass

    async def send_to_users(self, user_ids: List[str], payload: dict):
        for uid in user_ids:
            await self.send_to_user(uid, payload)


manager = ConnectionManager()
