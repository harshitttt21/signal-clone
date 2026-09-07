"""
Run with: python -m app.seed
Populates the DB with demo users (all use mock OTP 123456 to log in),
contacts, a couple of direct conversations, and one group with messages.
"""
import os
from datetime import datetime, timedelta

from .database import Base, engine, SessionLocal
from . import models

DEMO_USERS = [
    ("harshit", "Harshit"),
    ("vrinda", "Vrinda"),
    ("rhythm", "Rhythm"),
    ("garvit", "Garvit"),
    ("vanshika", "Vanshika"),
]


def avatar_for(name: str) -> str:
    seed = name.replace(" ", "+")
    return f"https://ui-avatars.com/api/?name={seed}&background=random&color=fff"


def run():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    users = {}
    for username, display_name in DEMO_USERS:
        u = models.User(
            phone_or_username=username,
            display_name=display_name,
            avatar_url=avatar_for(display_name),
            last_seen=datetime.utcnow(),
        )
        db.add(u)
        users[username] = u
    db.commit()
    for u in users.values():
        db.refresh(u)

    # Everyone is contacts with everyone, for demo convenience
    names = list(users.keys())
    for a in names:
        for b in names:
            if a != b:
                db.add(models.Contact(owner_id=users[a].id, contact_id=users[b].id))
    db.commit()

    def make_direct(u1, u2):
        conv = models.Conversation(is_group=False)
        db.add(conv)
        db.flush()
        db.add(models.ConversationMember(conversation_id=conv.id, user_id=users[u1].id))
        db.add(models.ConversationMember(conversation_id=conv.id, user_id=users[u2].id))
        db.commit()
        db.refresh(conv)
        return conv

    def add_message(conv, sender, body, minutes_ago):
        m = models.Message(
            conversation_id=conv.id,
            sender_id=users[sender].id,
            body=body,
            created_at=datetime.utcnow() - timedelta(minutes=minutes_ago),
        )
        db.add(m)
        db.commit()
        db.refresh(m)
        return m

    # Harshit <-> Vrinda
    c1 = make_direct("harshit", "vrinda")
    add_message(c1, "harshit", "Hey Vrinda! Are we still on for tomorrow?", 60)
    m = add_message(c1, "vrinda", "Yep, 10am works for me.", 55)
    db.add(models.MessageReceipt(message_id=m.id, user_id=users["harshit"].id, status=models.ReceiptStatus.read))
    m2 = add_message(c1, "harshit", "Perfect, see you then 👍", 50)
    db.add(models.MessageReceipt(message_id=m2.id, user_id=users["vrinda"].id, status=models.ReceiptStatus.delivered))
    db.commit()

    # Harshit <-> Rhythm
    c2 = make_direct("harshit", "rhythm")
    add_message(c2, "rhythm", "Did you get a chance to review the doc?", 30)
    m3 = add_message(c2, "harshit", "Not yet, will do it tonight!", 25)
    db.add(models.MessageReceipt(message_id=m3.id, user_id=users["rhythm"].id, status=models.ReceiptStatus.read))
    db.commit()

    # Vrinda <-> Garvit
    c3 = make_direct("vrinda", "garvit")
    add_message(c3, "garvit", "Lunch today?", 15)

    # Group: Weekend Trip (Harshit admin, Vrinda, Rhythm, Garvit, Vanshika)
    group = models.Conversation(is_group=True, name="Weekend Trip 🏔️")
    db.add(group)
    db.flush()
    db.add(models.ConversationMember(conversation_id=group.id, user_id=users["harshit"].id, role=models.MemberRole.admin))
    db.add(models.ConversationMember(conversation_id=group.id, user_id=users["vrinda"].id))
    db.add(models.ConversationMember(conversation_id=group.id, user_id=users["rhythm"].id))
    db.add(models.ConversationMember(conversation_id=group.id, user_id=users["garvit"].id))
    db.add(models.ConversationMember(conversation_id=group.id, user_id=users["vanshika"].id))
    db.commit()
    db.refresh(group)
    add_message(group, "harshit", "Hey everyone! Excited for the trip this weekend 🎉", 120)
    add_message(group, "vrinda", "Me too! What time are we leaving?", 110)
    add_message(group, "rhythm", "I was thinking 7am to beat traffic", 100)
    add_message(group, "garvit", "Works for me, I'll bring snacks", 90)
    add_message(group, "vanshika", "Can't wait! 🎉", 85)
    add_message(group, "harshit", "Perfect, see everyone at 7!", 80)

    print("Seed complete.")
    print("Demo accounts (all use OTP 123456):")
    for username, display_name in DEMO_USERS:
        print(f"  - {username}  ({display_name})")
    db.close()


if __name__ == "__main__":
    run()
