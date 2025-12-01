import requests
import time

BASE_URL = "http://localhost:3001/api"
AUTH_TOKEN = None  # Set your Bearer token here if authentication is required

HEADERS = {
    "Content-Type": "application/json",
}
if AUTH_TOKEN:
    HEADERS["Authorization"] = f"Bearer {AUTH_TOKEN}"

def test_notifications_real_time_and_unread_counts():
    timeout = 30

    # Helper to create a notification for user (simulate server notifying)
    def create_notification(user_id, title, message):
        payload = {
            "userId": user_id,
            "title": title,
            "message": message,
            "read": False
        }
        resp = requests.post(f"{BASE_URL}/notifications", json=payload, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.json()  # Expected to return created notification with id

    # Helper to get notifications and unread count for user
    def get_notifications(user_id):
        resp = requests.get(f"{BASE_URL}/notifications?userId={user_id}", headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.json()  # Expected: List of notifications

    def get_unread_count(user_id):
        resp = requests.get(f"{BASE_URL}/notifications/unread-count?userId={user_id}", headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.json().get("unreadCount", None)

    # Helper to mark notification as read
    def mark_as_read(notification_id):
        resp = requests.put(f"{BASE_URL}/notifications/{notification_id}/read", headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return resp.json()

    # Prepare dummy users for testing to simulate user-specific targeting
    # We assume user IDs 1001 and 1002 for test purpose
    user1_id = 1001
    user2_id = 1002

    created_notifications = []

    try:
        # Create notifications for user1
        n1 = create_notification(user1_id, "Payment Due", "Your payment is due tomorrow.")
        n2 = create_notification(user1_id, "Lease Expiry", "Your lease will expire next month.")

        # Create notification for user2
        n3 = create_notification(user2_id, "Maintenance Alert", "Scheduled maintenance tomorrow.")

        created_notifications.extend([n1, n2, n3])

        # Allow some time for "real-time" processing if needed (simulate delay)
        time.sleep(1)

        # Validate user1 notifications and unread count
        user1_notifications = get_notifications(user1_id)
        assert any(n["id"] == n1["id"] for n in user1_notifications), "Notification n1 missing for user1"
        assert any(n["id"] == n2["id"] for n in user1_notifications), "Notification n2 missing for user1"
        assert not any(n["id"] == n3["id"] for n in user1_notifications), "Notification for user2 appeared for user1"

        user1_unread_count = get_unread_count(user1_id)
        expected_unread_user1 = 2
        assert isinstance(user1_unread_count, int), "Unread count for user1 is not int"
        assert user1_unread_count == expected_unread_user1, f"Unread count for user1 expected {expected_unread_user1} but got {user1_unread_count}"

        # Validate user2 notifications and unread count
        user2_notifications = get_notifications(user2_id)
        assert any(n["id"] == n3["id"] for n in user2_notifications), "Notification n3 missing for user2"
        assert not any(n["id"] == n1["id"] for n in user2_notifications), "Notification for user1 appeared for user2"
        assert not any(n["id"] == n2["id"] for n in user2_notifications), "Notification for user1 appeared for user2"

        user2_unread_count = get_unread_count(user2_id)
        expected_unread_user2 = 1
        assert isinstance(user2_unread_count, int), "Unread count for user2 is not int"
        assert user2_unread_count == expected_unread_user2, f"Unread count for user2 expected {expected_unread_user2} but got {user2_unread_count}"

        # Mark one notification as read for user1 and verify unread count decreases
        mark_as_read(n1["id"])

        updated_unread_count_user1 = get_unread_count(user1_id)
        expected_unread_user1_after = 1
        assert updated_unread_count_user1 == expected_unread_user1_after, f"After marking read, expected unread {expected_unread_user1_after} but got {updated_unread_count_user1}"

        # Confirm read status in notifications list for user1
        user1_notifications_after = get_notifications(user1_id)
        n1_after = next((n for n in user1_notifications_after if n["id"] == n1["id"]), None)
        assert n1_after is not None, "Notification n1 missing after marking read"
        assert n1_after.get("read") == True, "Notification n1 read status not updated"

    finally:
        # Cleanup: delete created notifications to not pollute test data
        for notif in created_notifications:
            try:
                requests.delete(f"{BASE_URL}/notifications/{notif['id']}", headers=HEADERS, timeout=timeout)
            except Exception:
                pass


test_notifications_real_time_and_unread_counts()