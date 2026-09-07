from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class RequestOtpIn(BaseModel):
    phone_or_username: str


class RegisterIn(BaseModel):
    phone_or_username: str
    otp: str
    display_name: str
    avatar_url: Optional[str] = None


class LoginIn(BaseModel):
    phone_or_username: str
    otp: str


class UserOut(BaseModel):
    id: str
    phone_or_username: str
    display_name: str
    avatar_url: Optional[str] = None
    is_online: bool
    last_seen: datetime

    class Config:
        from_attributes = True


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AddContactIn(BaseModel):
    phone_or_username: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    body: str
    created_at: datetime
    status: str  # sending | sent | delivered | read (derived)

    class Config:
        from_attributes = True


class ConversationMemberOut(BaseModel):
    user: UserOut
    role: str

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: str
    is_group: bool
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    members: List[ConversationMemberOut]
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class CreateDirectConversationIn(BaseModel):
    contact_id: str


class CreateGroupIn(BaseModel):
    name: str
    member_ids: List[str]


class AddGroupMemberIn(BaseModel):
    user_id: str


class SendMessageIn(BaseModel):
    body: str
