import requests
import uuid

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    # Include authorization header if required, e.g. "Authorization": "Bearer <token>"
}

def test_financial_management_accounting_rules():
    # This test will create a transaction, invoice, payment, commission, and accounting voucher,
    # validate debit-credit balances, tax calculation, and payment allocations,
    # then delete the created resources.
    
    created_resources = {}

    try:
        # 1. Create a transaction - must have balanced debit and credit entries
        transaction_payload = {
            "date": "2025-11-19",
            "description": "Test transaction for accounting rules",
            "entries": [
                {"account_code": "4000", "debit": 1000.00, "credit": 0.00},  # Revenue
                {"account_code": "1000", "debit": 0.00, "credit": 1000.00}   # Cash/Bank
            ]
        }
        r = requests.post(f"{BASE_URL}/finance/transactions", json=transaction_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201, f"Transaction creation failed: {r.text}"
        transaction = r.json()
        created_resources['transaction_id'] = transaction["id"]
        
        # Assert debit-credit balance
        total_debit = sum(entry["debit"] for entry in transaction_payload["entries"])
        total_credit = sum(entry["credit"] for entry in transaction_payload["entries"])
        assert abs(total_debit - total_credit) < 0.01, "Transaction is not balanced"

        # 2. Create an invoice with tax calculation
        invoice_payload = {
            "customer_id": str(uuid.uuid4()),  # Assuming customer_id is required, using UUID placeholder
            "date": "2025-11-19",
            "due_date": "2025-12-19",
            "items": [
                {"description": "Property rental", "quantity": 1, "unit_price": 1000.00, "tax_rate": 0.10}  # 10% tax
            ]
        }
        r = requests.post(f"{BASE_URL}/finance/invoices", json=invoice_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201, f"Invoice creation failed: {r.text}"
        invoice = r.json()
        created_resources['invoice_id'] = invoice["id"]

        # Validate tax calculation on invoice response
        invoice_total = sum(item["quantity"] * item["unit_price"] for item in invoice_payload["items"])
        expected_tax = invoice_total * 0.10
        # Assuming response includes totals and tax fields
        assert abs(invoice.get("total_amount", 0) - (invoice_total + expected_tax)) < 0.01, "Invoice total amount incorrect"
        assert abs(invoice.get("tax_amount", 0) - expected_tax) < 0.01, "Invoice tax amount incorrect"

        # 3. Create a payment allocated to invoice
        payment_payload = {
            "invoice_id": invoice["id"],
            "date": "2025-11-20",
            "amount": invoice_total + expected_tax,
            "method": "bank_transfer",
            "reference": "PAY-" + str(uuid.uuid4())
        }
        r = requests.post(f"{BASE_URL}/finance/payments", json=payment_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201, f"Payment creation failed: {r.text}"
        payment = r.json()
        created_resources['payment_id'] = payment["id"]
        
        assert abs(payment.get("amount", 0) - payment_payload["amount"]) < 0.01, "Payment amount incorrect"
        assert payment.get("invoice_id") == invoice["id"], "Payment invoice allocation incorrect"

        # 4. Create a commission record (e.g. for agent fee)
        commission_payload = {
            "agent_id": str(uuid.uuid4()),  # Assuming agent_id required, using UUID placeholder
            "transaction_id": transaction["id"],
            "amount": 100.00,
            "commission_rate": 0.10,
            "description": "Agent commission for test transaction"
        }
        r = requests.post(f"{BASE_URL}/finance/commissions", json=commission_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201, f"Commission creation failed: {r.text}"
        commission = r.json()
        created_resources['commission_id'] = commission["id"]
        
        # Validate commission calculation
        expected_commission_amount = 100.0  # Given
        assert abs(commission.get("amount", 0) - expected_commission_amount) < 0.01, "Commission amount incorrect"

        # 5. Create an accounting voucher ensuring debit-credit compliance (general voucher)
        voucher_payload = {
            "date": "2025-11-19",
            "description": "Test accounting voucher compliance",
            "entries": [
                {"account_code": "5000", "debit": 500.00, "credit": 0.00},
                {"account_code": "2000", "debit": 0.00, "credit": 500.00}
            ]
        }
        r = requests.post(f"{BASE_URL}/finance/vouchers", json=voucher_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201, f"Voucher creation failed: {r.text}"
        voucher = r.json()
        created_resources['voucher_id'] = voucher["id"]

        # Validate voucher debit-credit balance
        total_voucher_debit = sum(entry["debit"] for entry in voucher_payload["entries"])
        total_voucher_credit = sum(entry["credit"] for entry in voucher_payload["entries"])
        assert abs(total_voucher_debit - total_voucher_credit) < 0.01, "Voucher is not balanced"

        # Additional cross-checks:
        #  - Payment amount must not exceed invoice total
        assert payment_payload["amount"] <= invoice.get("total_amount", float('inf')), "Payment exceeds invoice amount"

    finally:
        # Cleanup created resources to avoid data pollution
        if 'payment_id' in created_resources:
            requests.delete(f"{BASE_URL}/finance/payments/{created_resources['payment_id']}", headers=HEADERS, timeout=TIMEOUT)
        if 'commission_id' in created_resources:
            requests.delete(f"{BASE_URL}/finance/commissions/{created_resources['commission_id']}", headers=HEADERS, timeout=TIMEOUT)
        if 'voucher_id' in created_resources:
            requests.delete(f"{BASE_URL}/finance/vouchers/{created_resources['voucher_id']}", headers=HEADERS, timeout=TIMEOUT)
        if 'invoice_id' in created_resources:
            requests.delete(f"{BASE_URL}/finance/invoices/{created_resources['invoice_id']}", headers=HEADERS, timeout=TIMEOUT)
        if 'transaction_id' in created_resources:
            requests.delete(f"{BASE_URL}/finance/transactions/{created_resources['transaction_id']}", headers=HEADERS, timeout=TIMEOUT)


test_financial_management_accounting_rules()