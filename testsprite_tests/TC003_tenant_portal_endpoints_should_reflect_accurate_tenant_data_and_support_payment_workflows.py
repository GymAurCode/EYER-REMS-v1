import requests
import uuid

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30

# Assuming an authentication token is needed; put your valid token here.
AUTH_TOKEN = "Bearer YOUR_JWT_TOKEN_HERE"

HEADERS = {
    "Authorization": AUTH_TOKEN,
    "Content-Type": "application/json",
}


def test_tenant_portal_endpoints_should_reflect_accurate_tenant_data_and_support_payment_workflows():
    # Use an existing tenant ID for testing since tenant creation route is not available
    tenant_id = "existing-tenant-id"
    tenant_data = {
        "name": "Test Tenant",
        "unit": "Unit 101"
    }

    # Step 2: Verify tenant portal returns accurate tenant data
    tenant_portal_resp = requests.get(
        f"{BASE_URL}/tenant-portal/{tenant_id}/dashboard",
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert tenant_portal_resp.status_code == 200, f"Tenant portal dashboard fetch failed: {tenant_portal_resp.text}"
    tenant_portal_data = tenant_portal_resp.json()
    assert tenant_portal_data.get('tenantId') == tenant_id
    assert tenant_portal_data.get('name') == tenant_data['name']

    # Step 3: Create an invoice for the tenant (simulate invoice creation)
    invoice_payload = {
        "tenantId": tenant_id,
        "amount": 1500.00,
        "dueDate": "2025-12-31",
        "description": "Monthly Rent",
        "status": "pending"
    }
    create_invoice_resp = requests.post(
        f"{BASE_URL}/finance/invoices",
        json=invoice_payload,
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert create_invoice_resp.status_code == 201, f"Invoice creation failed: {create_invoice_resp.text}"
    invoice = create_invoice_resp.json()
    invoice_id = invoice.get('id')
    assert invoice_id, "Created invoice does not have an ID"

    # Step 4: Tenant views invoices
    invoices_resp = requests.get(
        f"{BASE_URL}/tenant-portal/{tenant_id}/invoices",
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert invoices_resp.status_code == 200, f"Fetching invoices failed: {invoices_resp.text}"
    invoices = invoices_resp.json()
    assert any(inv.get('id') == invoice_id for inv in invoices), "Created invoice not found in tenant invoice list"

    # Step 5: Process a payment for the invoice
    payment_payload = {
        "tenantId": tenant_id,
        "invoiceId": invoice_id,
        "amount": 1500.00,
        "paymentMethod": "credit_card",
        "transactionReference": str(uuid.uuid4())
    }
    payment_resp = requests.post(
        f"{BASE_URL}/tenant-portal/{tenant_id}/payments",
        json=payment_payload,
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert payment_resp.status_code == 201, f"Payment submission failed: {payment_resp.text}"
    payment = payment_resp.json()
    payment_id = payment.get('id')
    assert payment_id, "Created payment does not have an ID"

    # Step 6: Verify payment reflected in payment history
    payments_hist_resp = requests.get(
        f"{BASE_URL}/tenant-portal/{tenant_id}/payments",
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert payments_hist_resp.status_code == 200, f"Fetching payment history failed: {payments_hist_resp.text}"
    payment_history = payments_hist_resp.json()
    assert any(p.get('id') == payment_id for p in payment_history), "Payment not found in payment history"

    # Step 7: Submit a maintenance request
    maintenance_request_payload = {
        "tenantId": tenant_id,
        "unit": tenant_data["unit"],
        "subject": "Leaky faucet",
        "description": "The faucet in the kitchen is leaking continuously.",
        "priority": "medium"
    }
    maintenance_resp = requests.post(
        f"{BASE_URL}/tenant-portal/{tenant_id}/maintenance-requests",
        json=maintenance_request_payload,
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert maintenance_resp.status_code == 201, f"Maintenance request submission failed: {maintenance_resp.text}"
    maintenance_req = maintenance_resp.json()
    maintenance_req_id = maintenance_req.get('id')
    assert maintenance_req_id, "Created maintenance request does not have an ID"

    # Step 8: Verify maintenance requests list includes newly created request
    maintenance_list_resp = requests.get(
        f"{BASE_URL}/tenant-portal/{tenant_id}/maintenance-requests",
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert maintenance_list_resp.status_code == 200, f"Fetching maintenance requests failed: {maintenance_list_resp.text}"
    maintenance_requests = maintenance_list_resp.json()
    assert any(mr.get('id') == maintenance_req_id for mr in maintenance_requests), "Maintenance request not found"

    # Step 9: Upload a document to tenant documents (simulate upload, here just metadata as POST for test)
    document_payload = {
        "tenantId": tenant_id,
        "name": "Lease Agreement",
        "description": "Signed lease agreement document",
        "fileUrl": "http://example.com/fake-document.pdf"
    }
    upload_doc_resp = requests.post(
        f"{BASE_URL}/tenant-portal/{tenant_id}/documents",
        json=document_payload,
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert upload_doc_resp.status_code == 201, f"Document upload failed: {upload_doc_resp.text}"
    document = upload_doc_resp.json()
    document_id = document.get("id")
    assert document_id, "Uploaded document does not have an ID"

    # Step 10: Verify document is listed in tenant documents
    documents_resp = requests.get(
        f"{BASE_URL}/tenant-portal/{tenant_id}/documents",
        headers=HEADERS,
        timeout=TIMEOUT
    )
    assert documents_resp.status_code == 200, f"Fetching tenant documents failed: {documents_resp.text}"
    documents = documents_resp.json()
    assert any(doc.get("id") == document_id for doc in documents), "Uploaded document not found in documents list"


test_tenant_portal_endpoints_should_reflect_accurate_tenant_data_and_support_payment_workflows()
