from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..ws_manager import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _member_ids(db: Session, conversation_id: str) -> List[str]:
    rows = (
        db.query(models.ConversationMember.user_id)
        .filter(models.ConversationMember.conversation_id == conversation_id)
        .all()
    )
    return [r[0] for r in rows]


def _derive_status(db: Session, message: models.Message, other_member_ids: List[str]) -> str:
    if not other_member_ids:
        return "sent"
    receipts = {
        r.user_id: r.status
        for r in db.query(models.MessageReceipt).filter(
            models.MessageReceipt.message_id == message.id
        )
    }
    statuses = [receipts.get(uid) for uid in other_member_ids]
    if all(s == models.ReceiptStatus.read for s in statuses):
        return "read"
    if all(s in (models.ReceiptStatus.read, models.ReceiptStatus.delivered) for s in statuses):
        return "delivered"
    return "sent"


def _to_message_out(db: Session, message: models.Message, conversation_id: str, exclude_user: str) -> schemas.MessageOut:
    others = [uid for uid in _member_ids(db, conversation_id) if uid != exclude_user]
    status = _derive_status(db, message, others)
    return schemas.MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        body=message.body,
        created_at=message.created_at,
        status=status,
    )


def _to_conversation_out(db: Session, conv: models.Conversation, current_user_id: str) -> schemas.ConversationOut:
    members = (
        db.query(models.ConversationMember)
        .filter(models.ConversationMember.conversation_id == conv.id)
        .all()
    )
    member_outs = []
    display_name = conv.name
    display_avatar = conv.avatar_url
    for m in members:
        u = m.user
        u.is_online = manager.is_online(u.id)
        member_outs.append(schemas.ConversationMemberOut(user=u, role=m.role.value))
        if not conv.is_group and u.id != current_user_id:
            display_name = u.display_name
            display_avatar = u.avatar_url

    last_msg = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conv.id)
        .order_by(desc(models.Message.created_at))
        .first()
    )
    last_msg_out = None
    if last_msg:
        last_msg_out = _to_message_out(db, last_msg, conv.id, current_user_id)

    my_membership = next((m for m in members if m.user_id == current_user_id), None)
    unread_count = 0
    if my_membership:
        q = db.query(models.Message).filter(models.Message.conversation_id == conv.id)
        if my_membership.last_read_message_id:
            last_read = db.query(models.Message).filter(
                models.Message.id == my_membership.last_read_message_id
            ).first()
            if last_read:
                q = q.filter(models.Message.created_at > last_read.created_at)
        unread_count = q.filter(models.Message.sender_id != current_user_id).count()

    return schemas.ConversationOut(
        id=conv.id,
        is_group=conv.is_group,
        name=display_name,
        avatar_url=display_avatar,
        members=member_outs,
        last_message=last_msg_out,
        unread_count=unread_count,
    )


@router.get("", response_model=List[schemas.ConversationOut])
def list_conversations(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    memberships = (
        db.query(models.ConversationMember)
        .filter(models.ConversationMember.user_id == current_user.id)
        .all()
    )
    convs = []
    for m in memberships:
        convs.append(_to_conversation_out(db, m.conversation, current_user.id))

    from datetime import datetime as _dt

    convs.sort(
        key=lambda c: c.last_message.created_at if c.last_message else _dt.min,
        reverse=True,
    )
    return convs


@router.post("/direct", response_model=schemas.ConversationOut)
def create_direct_conversation(
    payload: schemas.CreateDirectConversationIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = db.query(models.User).filter(models.User.id == payload.contact_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if a direct conversation already exists between these two users
    my_conv_ids = set(
        r[0]
        for r in db.query(models.ConversationMember.conversation_id)
        .filter(models.ConversationMember.user_id == current_user.id)
        .all()
    )
    for conv_id in my_conv_ids:
        conv = db.query(models.Conversation).filter(models.Conversation.id == conv_id).first()
        if conv and not conv.is_group:
            member_ids = set(_member_ids(db, conv_id))
            if member_ids == {current_user.id, target.id}:
                return _to_conversation_out(db, conv, current_user.id)

    conv = models.Conversation(is_group=False)
    db.add(conv)
    db.flush()
    db.add(models.ConversationMember(conversation_id=conv.id, user_id=current_user.id, role=models.MemberRole.member))
    db.add(models.ConversationMember(conversation_id=conv.id, user_id=target.id, role=models.MemberRole.member))
    db.commit()
    db.refresh(conv)
    return _to_conversation_out(db, conv, current_user.id)


@router.post("/group", response_model=schemas.ConversationOut)
def create_group(
    payload: schemas.CreateGroupIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = models.Conversation(is_group=True, name=payload.name)
    db.add(conv)
    db.flush()
    db.add(
        models.ConversationMember(
            conversation_id=conv.id, user_id=current_user.id, role=models.MemberRole.admin
        )
    )
    for uid in set(payload.member_ids):
        if uid == current_user.id:
            continue
        user = db.query(models.User).filter(models.User.id == uid).first()
        if user:
            db.add(
                models.ConversationMember(
                    conversation_id=conv.id, user_id=uid, role=models.MemberRole.member
                )
            )
    db.commit()
    db.refresh(conv)
    return _to_conversation_out(db, conv, current_user.id)


@router.get("/{conversation_id}/messages", response_model=List[schemas.MessageOut])
def get_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = (
        db.query(models.ConversationMember)
        .filter(
            models.ConversationMember.conversation_id == conversation_id,
            models.ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    messages = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at)
        .all()
    )
    return [_to_message_out(db, m, conversation_id, current_user.id) for m in messages]


@router.post("/{conversation_id}/members", response_model=schemas.ConversationOut)
def add_group_member(
    conversation_id: str,
    payload: schemas.AddGroupMemberIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv or not conv.is_group:
        raise HTTPException(status_code=404, detail="Group not found")

    my_membership = (
        db.query(models.ConversationMember)
        .filter(
            models.ConversationMember.conversation_id == conversation_id,
            models.ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    if not my_membership or my_membership.role != models.MemberRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can add members")

    existing = (
        db.query(models.ConversationMember)
        .filter(
            models.ConversationMember.conversation_id == conversation_id,
            models.ConversationMember.user_id == payload.user_id,
        )
        .first()
    )
    if not existing:
        db.add(
            models.ConversationMember(
                conversation_id=conversation_id,
                user_id=payload.user_id,
                role=models.MemberRole.member,
            )
        )
        db.commit()
    return _to_conversation_out(db, conv, current_user.id)


@router.delete("/{conversation_id}/members/{user_id}", response_model=schemas.ConversationOut)
def remove_group_member(
    conversation_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv or not conv.is_group:
        raise HTTPException(status_code=404, detail="Group not found")

    my_membership = (
        db.query(models.ConversationMember)
        .filter(
            models.ConversationMember.conversation_id == conversation_id,
            models.ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    if not my_membership or (my_membership.role != models.MemberRole.admin and user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Only admins can remove other members")

    target_membership = (
        db.query(models.ConversationMember)
        .filter(
            models.ConversationMember.conversation_id == conversation_id,
            models.ConversationMember.user_id == user_id,
        )
        .first()
    )
    if target_membership:
        db.delete(target_membership)
        db.commit()
    return _to_conversation_out(db, conv, current_user.id)
