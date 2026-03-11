import requests
import uuid
import time

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30

def test_support_system_ticket_creation_and_resolution_workflow():
    headers = {
        "Content-Type": "application/json",
    }

    # Create a new support ticket
    ticket_payload = {
        "title": f"Test Support Ticket {uuid.uuid4()}",
        "description": "This is a test ticket created for automation testing of support workflows.",
        "priority": "medium",
        "category": "general",
        "attachments": [],
    }

    response = requests.post(f"{BASE_URL}/support/tickets", json=ticket_payload, headers=headers, timeout=TIMEOUT)
    assert response.status_code == 201, f"Ticket creation failed: {response.status_code} {response.text}"
    ticket = response.json()
    ticket_id = ticket.get("id")
    assert ticket_id is not None, "Created ticket has no id"

    try:
        # Verify ticket details
        resp_get = requests.get(f"{BASE_URL}/support/tickets/{ticket_id}", headers=headers, timeout=TIMEOUT)
        assert resp_get.status_code == 200, f"Failed to get ticket details: {resp_get.status_code} {resp_get.text}"
        ticket_data = resp_get.json()
        assert ticket_data["title"] == ticket_payload["title"]
        assert ticket_data["status"] == "open"

        # Update ticket status to 'in_progress'
        update_payload = {
            "status": "in_progress",
            "comment": "Started working on the ticket."
        }
        resp_update = requests.put(f"{BASE_URL}/support/tickets/{ticket_id}/status", json=update_payload, headers=headers, timeout=TIMEOUT)
        assert resp_update.status_code == 200, f"Failed to update ticket status: {resp_update.status_code} {resp_update.text}"
        updated_ticket = resp_update.json()
        assert updated_ticket["status"] == "in_progress"

        # Add a resolution comment and mark as resolved
        resolution_payload = {
            "status": "resolved",
            "comment": "Issue has been resolved successfully."
        }
        resp_resolve = requests.put(f"{BASE_URL}/support/tickets/{ticket_id}/status", json=resolution_payload, headers=headers, timeout=TIMEOUT)
        assert resp_resolve.status_code == 200, f"Failed to resolve ticket: {resp_resolve.status_code} {resp_resolve.text}"
        resolved_ticket = resp_resolve.json()
        assert resolved_ticket["status"] == "resolved"

        # Check audit logs for the ticket
        resp_audit = requests.get(f"{BASE_URL}/support/tickets/{ticket_id}/audit", headers=headers, timeout=TIMEOUT)
        assert resp_audit.status_code == 200, f"Failed to fetch audit logs: {resp_audit.status_code} {resp_audit.text}"
        audit_logs = resp_audit.json()
        assert isinstance(audit_logs, list), "Audit logs should be a list"
        assert any(log.get("action") == "created" for log in audit_logs), "Audit log missing ticket creation"
        assert any(log.get("action") == "status_update" and log.get("new_status") == "in_progress" for log in audit_logs), "Audit log missing in_progress status update"
        assert any(log.get("action") == "status_update" and log.get("new_status") == "resolved" for log in audit_logs), "Audit log missing resolved status update"

    finally:
        # Delete the created ticket to clean up
        del_resp = requests.delete(f"{BASE_URL}/support/tickets/{ticket_id}", headers=headers, timeout=TIMEOUT)
        assert del_resp.status_code in (200, 204), f"Failed to delete ticket: {del_resp.status_code} {del_resp.text}"

test_support_system_ticket_creation_and_resolution_workflow()