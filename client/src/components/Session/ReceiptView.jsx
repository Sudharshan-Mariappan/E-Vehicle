import { useAuth } from '../../context/AuthContext';

/**
 * ReceiptView — Generates a print-ready charging receipt in a new window.
 * Called from SessionHistory with session data.
 */
const ReceiptView = {
    print(session, user) {
        const duration = session.end_time && session.start_time
            ? (() => {
                const diff = Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000);
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;
                return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
            })()
            : 'N/A';

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>EV Charging Receipt #${session.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', 'Inter', sans-serif; background: #f9fafb; padding: 2rem; color: #1a1a2e; }
    .receipt { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .receipt-header { background: linear-gradient(135deg, #0d1b2a, #1a2744); color: #fff; padding: 1.5rem 2rem; text-align: center; }
    .receipt-header h1 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.25rem; }
    .receipt-header .brand { color: #00d4aa; font-size: 1.1rem; font-weight: 700; }
    .receipt-header .invoice-id { font-size: 0.8rem; opacity: 0.7; margin-top: 0.5rem; }
    .receipt-body { padding: 1.5rem 2rem; }
    .receipt-row { display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
    .receipt-row:last-child { border-bottom: none; }
    .receipt-label { color: #6b7280; }
    .receipt-value { font-weight: 600; text-align: right; }
    .receipt-total { display: flex; justify-content: space-between; padding: 1rem 2rem; background: #f0fdf4; border-top: 2px solid #00d4aa; }
    .receipt-total .label { font-weight: 600; color: #374151; font-size: 1rem; }
    .receipt-total .value { font-weight: 800; color: #059669; font-size: 1.2rem; }
    .receipt-footer { text-align: center; padding: 1rem 2rem 1.5rem; font-size: 0.75rem; color: #9ca3af; }
    .status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .status-completed { background: #dcfce7; color: #16a34a; }
    .status-cancelled { background: #fee2e2; color: #ef4444; }
    .status-active { background: #fef3c7; color: #d97706; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="brand">⚡ EV Charge Finder</div>
      <h1>Charging Receipt</h1>
      <div class="invoice-id">Invoice #EV-${String(session.id).padStart(6, '0')}</div>
    </div>
    <div class="receipt-body">
      <div class="receipt-row">
        <span class="receipt-label">Date</span>
        <span class="receipt-value">${new Date(session.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Customer</span>
        <span class="receipt-value">${user?.name || 'N/A'}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Station</span>
        <span class="receipt-value">${session.station_name}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Address</span>
        <span class="receipt-value" style="max-width:60%;text-align:right">${session.address || 'N/A'}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Slot</span>
        <span class="receipt-value">${session.slot_name} (${session.connector_type})</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Start Time</span>
        <span class="receipt-value">${new Date(session.start_time).toLocaleString('en-IN')}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">End Time</span>
        <span class="receipt-value">${session.end_time ? new Date(session.end_time).toLocaleString('en-IN') : 'N/A'}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Duration</span>
        <span class="receipt-value">${duration}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Energy Consumed</span>
        <span class="receipt-value">${parseFloat(session.energy_consumed || 0).toFixed(3)} kWh</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Status</span>
        <span class="receipt-value"><span class="status-badge status-${session.status}">${session.status}</span></span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Payment</span>
        <span class="receipt-value">${session.payment_status || 'Wallet'}</span>
      </div>
    </div>
    <div class="receipt-total">
      <span class="label">Total Amount</span>
      <span class="value">₹${parseFloat(session.total_cost || 0).toFixed(2)}</span>
    </div>
    <div class="receipt-footer">
      <p>Thank you for charging with EV Charge Finder!</p>
      <p style="margin-top:0.3rem">This is a computer-generated receipt.</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:1.5rem" class="no-print">
    <button onclick="window.print()" style="padding:0.6rem 1.5rem;background:#00d4aa;color:#000;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem">
      🖨️ Print Receipt
    </button>
  </div>
</body>
</html>`;

        const w = window.open('', '_blank', 'width=560,height=720');
        if (w) {
            w.document.write(html);
            w.document.close();
        }
    }
};

export default ReceiptView;
