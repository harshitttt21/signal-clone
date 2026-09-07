import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Enum as SAEnum,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_uuid():
    return str(uuid.uuid4())


class MemberRole(str, enum.Enum):
    admin = "admin"
    member = "member"


class ReceiptStatus(str, enum.Enum):
    delivered = "delivered"
    read = "read"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    phone_or_username = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("ConversationMember", back_populates="user")
    messages = relationship("Message", back_populates="sender")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    is_group = Column(Boolean, default=False)
    name = Column(String, nullable=True)  # only meaningful for groups
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship(
        "ConversationMember", back_populates="conversation", cascade="all, delete-orphan"
    )
    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )


class ConversationMember(Base):
    __tablename__ = "conversation_members"
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_user"),
    )

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(SAEnum(MemberRole), default=MemberRole.member)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_read_message_id = Column(String, nullable=True)

    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="messages")
    receipts = relationship(
        "MessageReceipt", back_populates="message", cascade="all, delete-orphan"
    )


class MessageReceipt(Base):
    __tablename__ = "message_receipts"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_user_receipt"),
    )

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(ReceiptStatus), default=ReceiptStatus.delivered)
    timestamp = Column(DateTime, default=datetime.utcnow)

    message = relationship("Message", back_populates="receipts")


class Contact(Base):
    """Explicit contact list, separate from conversation membership."""

    __tablename__ = "contacts"
    __table_args__ = (
        UniqueConstraint("owner_id", "contact_id", name="uq_owner_contact"),
    )

    id = Column(String, primary_key=True, default=gen_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    contact_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
