import requests
import uuid

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30

# Assume we have a valid JWT token with CRM permissions for test
# Replace this with actual token retrieval logic if needed
AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."


def test_crm_module_stage_updates_with_permissions():
    headers = {
        "Authorization": AUTH_TOKEN,
        "Content-Type": "application/json"
    }

    created_lead_id = None
    created_client_id = None
    created_deal_id = None
    created_communication_id = None

    try:
        # 1. Create Lead
        lead_payload = {
            "name": f"Test Lead {str(uuid.uuid4())[:8]}",
            "email": "lead@example.com",
            "phone": "1234567890",
            "stage": "new"  # initial stage
        }
        lead_resp = requests.post(f"{BASE_URL}/crm/leads", json=lead_payload, headers=headers, timeout=TIMEOUT)
        assert lead_resp.status_code == 201, f"Failed to create lead: {lead_resp.text}"
        lead_data = lead_resp.json()
        created_lead_id = lead_data.get("id")
        assert created_lead_id is not None

        # 2. Update Lead Stage - Check permissions and correct stage update
        update_lead_stage_payload = {
            "stage": "contacted"
        }
        lead_update_resp = requests.put(f"{BASE_URL}/crm/leads/{created_lead_id}/stage", json=update_lead_stage_payload, headers=headers, timeout=TIMEOUT)
        assert lead_update_resp.status_code == 200, f"Failed to update lead stage: {lead_update_resp.text}"
        updated_lead = lead_update_resp.json()
        assert updated_lead.get("stage") == "contacted", "Lead stage did not update correctly"

        # 3. Convert Lead to Client (simulate if such endpoint exists)
        # If no direct convert endpoint, create client based on lead data:
        client_payload = {
            "name": lead_payload["name"],
            "email": lead_payload["email"],
            "phone": lead_payload["phone"],
            "source_lead_id": created_lead_id,
            "stage": "prospect"  # client stage initial
        }
        client_resp = requests.post(f"{BASE_URL}/crm/clients", json=client_payload, headers=headers, timeout=TIMEOUT)
        assert client_resp.status_code == 201, f"Failed to create client: {client_resp.text}"
        client_data = client_resp.json()
        created_client_id = client_data.get("id")
        assert created_client_id is not None

        # 4. Create Deal associated with client
        deal_payload = {
            "clientId": created_client_id,
            "title": f"Deal for {client_payload['name']}",
            "value": 100000,
            "stage": "negotiation"  # initial deal stage
        }
        deal_resp = requests.post(f"{BASE_URL}/crm/deals", json=deal_payload, headers=headers, timeout=TIMEOUT)
        assert deal_resp.status_code == 201, f"Failed to create deal: {deal_resp.text}"
        deal_data = deal_resp.json()
        created_deal_id = deal_data.get("id")
        assert created_deal_id is not None

        # 5. Update Deal Stage - Respect permissions and business logic
        update_deal_stage_payload = {
            "stage": "closed_won"
        }
        deal_update_resp = requests.put(f"{BASE_URL}/crm/deals/{created_deal_id}/stage", json=update_deal_stage_payload, headers=headers, timeout=TIMEOUT)
        assert deal_update_resp.status_code == 200, f"Failed to update deal stage: {deal_update_resp.text}"
        updated_deal = deal_update_resp.json()
        assert updated_deal.get("stage") == "closed_won", "Deal stage did not update correctly"

        # 6. Create Communication related to deal
        communication_payload = {
            "dealId": created_deal_id,
            "clientId": created_client_id,
            "type": "email",
            "subject": "Follow up on deal",
            "content": "Discussed closing terms and agreement.",
            "stageImpact": True  # indicates this communication affects stage updates
        }
        comm_resp = requests.post(f"{BASE_URL}/crm/communications", json=communication_payload, headers=headers, timeout=TIMEOUT)
        assert comm_resp.status_code == 201, f"Failed to create communication: {comm_resp.text}"
        comm_data = comm_resp.json()
        created_communication_id = comm_data.get("id")
        assert created_communication_id is not None

        # 7. Verify business logic: After this communication, deal's stage should remain or update accordingly
        # Fetch deal again to verify consistency
        deal_get_resp = requests.get(f"{BASE_URL}/crm/deals/{created_deal_id}", headers=headers, timeout=TIMEOUT)
        assert deal_get_resp.status_code == 200, f"Failed to fetch deal: {deal_get_resp.text}"
        deal_after_comm = deal_get_resp.json()
        # Assert stage is consistent and authorized
        # For example, the stage remains 'closed_won' or changed per business logic
        assert deal_after_comm.get("stage") in ["closed_won", "negotiation"], "Deal stage inconsistent after communication"

        # 8. Verify permission enforcement on stage update for lead (simulate unauthorized user)
        # For this test, we simulate by removing token or using invalid token for update and expect error 403 or 401
        unauthorized_headers = {
            "Authorization": "Bearer invalid_or_no_permission_token",
            "Content-Type": "application/json"
        }
        unauthorized_update_resp = requests.put(
            f"{BASE_URL}/crm/leads/{created_lead_id}/stage",
            json={"stage": "qualified"},
            headers=unauthorized_headers,
            timeout=TIMEOUT
        )
        assert unauthorized_update_resp.status_code in [401, 403], "Unauthorized stage update did not fail as expected"

    finally:
        # Cleanup communications
        if created_communication_id:
            requests.delete(f"{BASE_URL}/crm/communications/{created_communication_id}", headers=headers, timeout=TIMEOUT)

        # Cleanup deals
        if created_deal_id:
            requests.delete(f"{BASE_URL}/crm/deals/{created_deal_id}", headers=headers, timeout=TIMEOUT)

        # Cleanup clients
        if created_client_id:
            requests.delete(f"{BASE_URL}/crm/clients/{created_client_id}", headers=headers, timeout=TIMEOUT)

        # Cleanup leads
        if created_lead_id:
            requests.delete(f"{BASE_URL}/crm/leads/{created_lead_id}", headers=headers, timeout=TIMEOUT)


test_crm_module_stage_updates_with_permissions()