import json
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_user_from_token
from ..database import SessionLocal
from ..ws_manager import manager
from .conversations import _member_ids, _to_message_out

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    db: Session = SessionLocal()
    try:
        user = get_user_from_token(token, db)
    except Exception:
        await websocket.close(code=4001)
        db.close()
        return
    if not user:
        await websocket.close(code=4001)
        db.close()
        return

    await manager.connect(user.id, websocket)
    user.is_online = True
    user.last_seen = datetime.utcnow()
    db.commit()

    # Notify everyone who shares a conversation with this user that they're online
    my_conv_ids = [
        r[0]
        for r in db.query(models.ConversationMember.conversation_id)
        .filter(models.ConversationMember.user_id == user.id)
        .all()
    ]
    peers = set()
    for cid in my_conv_ids:
        for uid in _member_ids(db, cid):
            if uid != user.id:
                peers.add(uid)
    await manager.send_to_users(list(peers), {"type": "presence", "user_id": user.id, "is_online": True})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "message:send":
                await handle_send_message(db, user, data)
            elif msg_type == "typing":
                await handle_typing(db, user, data)
            elif msg_type == "receipt":
                await handle_receipt(db, user, data)

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user.id, websocket)
        if not manager.is_online(user.id):
            user.is_online = False
            user.last_seen = datetime.utcnow()
            db.commit()
            await manager.send_to_users(
                list(peers), {"type": "presence", "user_id": user.id, "is_online": False}
            )
        db.close()


async def handle_send_message(db: Session, user: models.User, data: dict):
    conversation_id = data.get("conversation_id")
    body = (data.get("body") or "").strip()
    client_temp_id = data.get("client_temp_id")
    if not conversation_id or not body:
        return

    membership = (
        db.query(models.ConversationMember)
        .filter(
            models.ConversationMember.conversation_id == conversation_id,
            models.ConversationMember.user_id == user.id,
        )
        .first()
    )
    if not membership:
        return

    message = models.Message(conversation_id=conversation_id, sender_id=user.id, body=body)
    db.add(message)
    db.commit()
    db.refresh(message)

    other_ids = [uid for uid in _member_ids(db, conversation_id) if uid != user.id]

    # Auto-create "delivered" receipts for members who are currently online
    for uid in other_ids:
        if manager.is_online(uid):
            db.add(
                models.MessageReceipt(
                    message_id=message.id, user_id=uid, status=models.ReceiptStatus.delivered
                )
            )
    db.commit()

    message_out = _to_message_out(db, message, conversation_id, user.id)
    payload = {
        "type": "message:new",
        "conversation_id": conversation_id,
        "message": message_out.model_dump(mode="json"),
        "client_temp_id": client_temp_id,
    }
    all_ids = other_ids + [user.id]
    await manager.send_to_users(all_ids, payload)

    # Tell the sender about delivery status right away for online recipients
    for uid in other_ids:
        if manager.is_online(uid):
            await manager.send_to_user(
                user.id,
                {
                    "type": "receipt:update",
                    "message_id": message.id,
                    "conversation_id": conversation_id,
                    "user_id": uid,
                    "status": "delivered",
                },
            )


async def handle_typing(db: Session, user: models.User, data: dict):
    conversation_id = data.get("conversation_id")
    is_typing = bool(data.get("is_typing"))
    if not conversation_id:
        return
    other_ids = [uid for uid in _member_ids(db, conversation_id) if uid != user.id]
    await manager.send_to_users(
        other_ids,
        {
            "type": "typing",
            "conversation_id": conversation_id,
            "user_id": user.id,
            "is_typing": is_typing,
        },
    )


async def handle_receipt(db: Session, user: models.User, data: dict):
    message_id = data.get("message_id")
    status = data.get("status")  # "delivered" | "read"
    if not message_id or status not in ("delivered", "read"):
        return

    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message:
        return

    receipt = (
        db.query(models.MessageReceipt)
        .filter(
            models.MessageReceipt.message_id == message_id,
            models.MessageReceipt.user_id == user.id,
        )
        .first()
    )
    new_status = models.ReceiptStatus.read if status == "read" else models.ReceiptStatus.delivered
    if receipt:
        # never downgrade read -> delivered
        if receipt.status == models.ReceiptStatus.read:
            return
        receipt.status = new_status
    else:
        receipt = models.MessageReceipt(message_id=message_id, user_id=user.id, status=new_status)
        db.add(receipt)

    # update conversation membership's last_read pointer when marking read
    if new_status == models.ReceiptStatus.read:
        membership = (
            db.query(models.ConversationMember)
            .filter(
                models.ConversationMember.conversation_id == message.conversation_id,
                models.ConversationMember.user_id == user.id,
            )
            .first()
        )
        if membership:
            membership.last_read_message_id = message_id

    db.commit()

    await manager.send_to_user(
        message.sender_id,
        {
            "type": "receipt:update",
            "message_id": message_id,
            "conversation_id": message.conversation_id,
            "user_id": user.id,
            "status": new_status.value,
        },
    )
