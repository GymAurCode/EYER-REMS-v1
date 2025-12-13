"use client"

import { useEffect, useRef } from "react"
import { formatCurrency } from "@/lib/utils"

type PropertyReportHTMLProps = {
  property: {
    id?: string | number
    name?: string
    propertyCode?: string
    type?: string
    status?: string
    yearBuilt?: string | number
    totalArea?: string | number
    units?: number | any[]
    occupied?: number
    salePrice?: number | string
    address?: string
  }
  financeSummary?: {
    totalReceived?: number
    totalExpenses?: number
    pendingAmount?: number
    entries?: number
  }
  paymentPlan?: {
    totalAmount?: number
    downPayment?: number
    installments?: number
    installmentAmount?: number
    duration?: string
    schedule?: Array<{
      no: number
      date: string
      amount: string
      status: string
    }>
  }
  deals?: Array<{
    title?: string
    contactName?: string
    amount?: number
    received?: number
    pending?: number
    stage?: string
  }>
  hideActions?: boolean // Hide download/print buttons when true
}

const formatArea = (sqFt?: number | string): string => {
  if (!sqFt) return "N/A"
  const numSqFt = typeof sqFt === "string" ? parseFloat(sqFt) : sqFt
  if (isNaN(numSqFt)) return String(sqFt)
  
  if (numSqFt >= 5445) {
    const kanal = Math.floor(numSqFt / 5445)
    const remainingMarla = Math.round((numSqFt % 5445) / 272.25)
    return remainingMarla > 0 ? `${kanal} Kanal ${remainingMarla} Marla (${numSqFt.toLocaleString()} sq ft)` : `${kanal} Kanal (${numSqFt.toLocaleString()} sq ft)`
  }
  const marla = Math.round(numSqFt / 272.25)
  return `${marla} Marla (${numSqFt.toLocaleString()} sq ft)`
}

export function PropertyReportHTML({ property, financeSummary = {}, paymentPlan, deals = [], hideActions = false }: PropertyReportHTMLProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframeRef.current) return

    const iframe = iframeRef.current
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

    if (!iframeDoc) return

    // Prepare data
    const unitsValue = typeof property.units === "number" ? property.units : Array.isArray(property.units) ? property.units.length : 0
    const totalAreaValue = typeof property.totalArea === "number" ? property.totalArea : typeof property.totalArea === "string" ? parseFloat(property.totalArea.replace(/[^0-9.]/g, "")) || 0 : 0

    const reportData = {
      generatedOn: new Date().toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      systemId: property.propertyCode ? `PROP-${property.propertyCode}` : `PROP-${property.id}`,
      propertyName: property.name || "N/A",
      type: property.type || "N/A",
      status: property.status || "N/A",
      yearBuilt: property.yearBuilt || "N/A",
      totalArea: formatArea(totalAreaValue),
      units: `${property.occupied || 0} / ${unitsValue}`,
      salesPrice: property.salePrice ? formatCurrency(Number(property.salePrice)) : "Rs 0",
      address: property.address || "N/A",
      finance: {
        totalReceived: formatCurrency(financeSummary.totalReceived || 0),
        totalExpenses: formatCurrency(financeSummary.totalExpenses || 0),
        pendingAmount: formatCurrency(financeSummary.pendingAmount || 0),
        entries: financeSummary.entries || 0,
      },
      paymentPlan: paymentPlan
        ? {
            totalAmount: formatCurrency(paymentPlan.totalAmount || 0),
            downPayment: formatCurrency(paymentPlan.downPayment || 0),
            installments: paymentPlan.installments || 0,
            installmentAmount: formatCurrency(paymentPlan.installmentAmount || 0),
            duration: paymentPlan.duration || "N/A",
            schedule:
              paymentPlan.schedule?.map((s) => ({
                no: s.no,
                date: s.date,
                amount: s.amount,
                status: s.status,
              })) || [],
          }
        : null,
      deals: deals.map((deal) => ({
        title: deal.title || "N/A",
        client: deal.contactName || "N/A",
        amount: formatCurrency(deal.amount || 0),
        received: formatCurrency(deal.received || 0),
        pending: formatCurrency(deal.pending || 0),
        stage: deal.stage || "N/A",
      })),
    }

    // Generate HTML
    const htmlContent = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Property Report — Modal Town</title>
<style>
:root{
  --bg:#f6f8fb;
  --card:#ffffff;
  --muted:#6b7280;
  --accent:#0f766e;
  --danger:#b91c1c;
  --shadow:0 6px 18px rgba(15,15,15,0.06);
  font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;
}
body{margin:0;background:var(--bg);color:#0b1220}
.container{max-width:1000px;margin:24px auto;padding:20px}
header{
  display:flex;justify-content:space-between;gap:20px;
  background:linear-gradient(90deg,#052e2b,#0f766e);
  color:#fff;padding:18px;border-radius:10px;
}
.brand{font-size:20px;font-weight:700}
.card{
  background:var(--card);
  margin-top:18px;
  padding:18px;
  border-radius:10px;
  box-shadow:var(--shadow)
}
h2{margin:0 0 10px 0;font-size:18px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.row{display:flex;justify-content:space-between}
.label{color:var(--muted);font-size:13px}
.value{font-weight:600}
.money{color:var(--danger)}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{padding:10px;border-bottom:1px solid #eef1f5;text-align:left}
.actions{display:flex;gap:10px;margin-top:14px}
button{
  border:0;border-radius:8px;
  padding:10px 14px;
  font-weight:600;cursor:pointer
}
.print{background:#0f766e;color:#fff}
.download{background:#111827;color:#fff}
@media(max-width:720px){
  .grid{grid-template-columns:1fr}
  header{flex-direction:column}
}
@media print{
  .actions{display:none !important}
  body{background:#fff}
}
</style>
</head>
<body>
<div class="container">
<header>
  <div>
    <div class="brand">Modal Town — Property Report</div>
    <div style="font-size:13px;opacity:.9">Generated by REMS</div>
  </div>
  <div style="text-align:right;font-size:13px">
    <div id="generatedOn"></div>
    <div id="systemId"></div>
  </div>
</header>

<!-- BASIC INFO -->
<section class="card">
<h2>Basic Information</h2>
<div style="margin-bottom:10px">
  <div class="row"><span class="label">Property Name</span><span id="propertyName" class="value" style="font-size:16px;font-weight:700"></span></div>
</div>
<div class="grid">
  <div>
    <div class="row"><span class="label">Type</span><span id="type" class="value"></span></div>
    <div class="row"><span class="label">Status</span><span id="status" class="value"></span></div>
    <div class="row"><span class="label">Year Built</span><span id="yearBuilt" class="value"></span></div>
  </div>
  <div>
    <div class="row"><span class="label">Area</span><span id="totalArea" class="value"></span></div>
    <div class="row"><span class="label">Units</span><span id="units" class="value"></span></div>
    <div class="row"><span class="label">Sale Price</span><span id="salesPrice" class="value"></span></div>
  </div>
</div>
<p id="address" style="margin-top:10px;color:var(--muted)"></p>
</section>

<!-- FINANCE -->
<section class="card">
<h2>Finance Summary</h2>
<div class="grid">
  <div>
    <div class="row"><span class="label">Total Received</span><span id="totalReceived" class="value"></span></div>
    <div class="row"><span class="label">Total Expenses</span><span id="totalExpenses" class="value"></span></div>
  </div>
  <div>
    <div class="row"><span class="label">Pending</span><span id="pendingAmount" class="value money"></span></div>
    <div class="row"><span class="label">Entries</span><span id="entries" class="value"></span></div>
  </div>
</div>
</section>

${reportData.paymentPlan ? `<!-- PAYMENT PLAN -->
<section class="card">
<h2>Payment Plan</h2>
<div class="grid">
  <div class="row"><span class="label">Total Amount</span><span id="planTotal" class="value"></span></div>
  <div class="row"><span class="label">Down Payment</span><span id="downPayment" class="value"></span></div>
  <div class="row"><span class="label">Installments</span><span id="installments" class="value"></span></div>
  <div class="row"><span class="label">Installment Amount</span><span id="installmentAmount" class="value"></span></div>
  <div class="row"><span class="label">Duration</span><span id="duration" class="value"></span></div>
</div>
<table>
<thead>
<tr><th>#</th><th>Due Date</th><th>Amount</th><th>Status</th></tr>
</thead>
<tbody id="paymentRows"></tbody>
</table>
</section>` : ""}

<!-- DEALS -->
<section class="card">
<h2>Running Deals</h2>
<table>
<thead>
<tr><th>Deal</th><th>Client</th><th>Amount</th><th>Received</th><th>Pending</th><th>Stage</th></tr>
</thead>
<tbody id="dealRows"></tbody>
</table>
</section>

${hideActions ? "" : `<div class="actions">
    <button class="download" id="download">Download Report</button>
    <button class="print" onclick="window.print()">Print / PDF</button>
</div>`}
</div>
<script>
(function() {
  const data = ${JSON.stringify(reportData, null, 2)};
  
  function renderReport() {
    try {
      const generatedOnEl = document.getElementById('generatedOn');
      const systemIdEl = document.getElementById('systemId');
      const typeEl = document.getElementById('type');
      const statusEl = document.getElementById('status');
      const yearBuiltEl = document.getElementById('yearBuilt');
      const totalAreaEl = document.getElementById('totalArea');
      const unitsEl = document.getElementById('units');
      const salesPriceEl = document.getElementById('salesPrice');
      const addressEl = document.getElementById('address');
      const totalReceivedEl = document.getElementById('totalReceived');
      const totalExpensesEl = document.getElementById('totalExpenses');
      const pendingAmountEl = document.getElementById('pendingAmount');
      const entriesEl = document.getElementById('entries');
      
      const propertyNameEl = document.getElementById('propertyName');
      if (propertyNameEl) propertyNameEl.textContent = data.propertyName || "N/A";
      if (generatedOnEl) generatedOnEl.textContent = "Generated: " + (data.generatedOn || "N/A");
      if (systemIdEl) systemIdEl.textContent = "System ID: " + (data.systemId || "N/A");
      if (typeEl) typeEl.textContent = data.type || "N/A";
      if (statusEl) statusEl.textContent = data.status || "N/A";
      if (yearBuiltEl) yearBuiltEl.textContent = data.yearBuilt || "N/A";
      if (totalAreaEl) totalAreaEl.textContent = data.totalArea || "N/A";
      if (unitsEl) unitsEl.textContent = data.units || "0 / 0";
      if (salesPriceEl) salesPriceEl.textContent = data.salesPrice || "Rs 0";
      if (addressEl) addressEl.textContent = data.address || "N/A";
      if (totalReceivedEl) totalReceivedEl.textContent = data.finance?.totalReceived || "Rs 0";
      if (totalExpensesEl) totalExpensesEl.textContent = data.finance?.totalExpenses || "Rs 0";
      if (pendingAmountEl) pendingAmountEl.textContent = data.finance?.pendingAmount || "Rs 0";
      if (entriesEl) entriesEl.textContent = data.finance?.entries || 0;
      
      ${reportData.paymentPlan ? `
      const planTotalEl = document.getElementById('planTotal');
      const downPaymentEl = document.getElementById('downPayment');
      const installmentsEl = document.getElementById('installments');
      const installmentAmountEl = document.getElementById('installmentAmount');
      const durationEl = document.getElementById('duration');
      const paymentRowsEl = document.getElementById('paymentRows');
      
      if (planTotalEl && data.paymentPlan) planTotalEl.textContent = data.paymentPlan.totalAmount || "Rs 0";
      if (downPaymentEl && data.paymentPlan) downPaymentEl.textContent = data.paymentPlan.downPayment || "Rs 0";
      if (installmentsEl && data.paymentPlan) installmentsEl.textContent = data.paymentPlan.installments || 0;
      if (installmentAmountEl && data.paymentPlan) installmentAmountEl.textContent = data.paymentPlan.installmentAmount || "Rs 0";
      if (durationEl && data.paymentPlan) durationEl.textContent = data.paymentPlan.duration || "N/A";
      if (paymentRowsEl && data.paymentPlan && data.paymentPlan.schedule) {
        paymentRowsEl.innerHTML = data.paymentPlan.schedule
          .map(p => \`<tr><td>\${p.no || ''}</td><td>\${p.date || 'N/A'}</td><td>\${p.amount || 'Rs 0'}</td><td>\${p.status || 'Pending'}</td></tr>\`)
          .join("");
      }
      ` : ""}
      
      const dealRowsEl = document.getElementById('dealRows');
      if (dealRowsEl && data.deals) {
        if (data.deals.length > 0) {
          dealRowsEl.innerHTML = data.deals
            .map(d => \`<tr><td>\${d.title || 'N/A'}</td><td>\${d.client || 'N/A'}</td><td>\${d.amount || 'Rs 0'}</td><td>\${d.received || 'Rs 0'}</td><td>\${d.pending || 'Rs 0'}</td><td>\${d.stage || 'N/A'}</td></tr>\`)
            .join("");
        } else {
          dealRowsEl.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);">No deals found</td></tr>';
        }
      }
      
      const downloadBtn = document.getElementById('download');
      if (downloadBtn) {
        downloadBtn.onclick = function() {
          // Generate HTML report for download
          const htmlContent = document.documentElement.outerHTML;
          const b = new Blob([htmlContent], {type: "text/html"});
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = "property-report.html";
          a.click();
        };
      }
    } catch (error) {
      console.error('Error rendering report:', error);
    }
  }
  
  // Hide actions if page is opened standalone (not in iframe)
  // This ensures buttons don't show in downloaded/printed reports
  function hideActionsIfStandalone() {
    try {
      const isInIframe = window.self !== window.top;
      if (!isInIframe) {
        const actionsEl = document.querySelector('.actions');
        if (actionsEl) {
          actionsEl.style.display = 'none';
        }
      }
    } catch (e) {
      // Cross-origin iframe check might throw, assume standalone
      const actionsEl = document.querySelector('.actions');
      if (actionsEl) {
        actionsEl.style.display = 'none';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      renderReport();
      hideActionsIfStandalone();
    });
  } else {
    renderReport();
    hideActionsIfStandalone();
  }
})();
</script>
</body>
</html>`

    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()
  }, [property, financeSummary, paymentPlan, deals])

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        style={{ minHeight: "800px" }}
        title="Property Report"
      />
    </div>
  )
}

