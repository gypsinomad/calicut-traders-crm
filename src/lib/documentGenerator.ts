import { ExportOrder, DocType } from './types';

const COMPANY_DETAILS = {
  name: '[COMPANY NAME]',
  address: '[COMPANY ADDRESS]',
  email: '[COMPANY EMAIL]',
  phone: '[COMPANY PHONE]',
  gstin: '[GSTIN]',
  iec: '[IEC]',
  fssai: '[FSSAI]',
  pan: '[PAN]'
};

const getHeader = (title: string, refNo: string, date: string) => `
  <div style="font-family: 'Inter', sans-serif; color: #18181b; max-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #e4e4e7;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px;">
      <div>
        <h1 style="margin: 0; color: #065f46; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${COMPANY_DETAILS.name}</h1>
        <p style="margin: 5px 0 0; font-size: 12px; color: #71717a; max-width: 300px;">${COMPANY_DETAILS.address}</p>
        <p style="margin: 2px 0 0; font-size: 11px; color: #71717a;">GSTIN: ${COMPANY_DETAILS.gstin} | IEC: ${COMPANY_DETAILS.iec}</p>
      </div>
      <div style="text-align: right;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #18181b; text-transform: uppercase;">${title}</h2>
        <p style="margin: 5px 0 0; font-size: 12px; color: #71717a;">Ref No: <strong>${refNo}</strong></p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #71717a;">Date: <strong>${date}</strong></p>
      </div>
    </div>
`;

const getFooter = () => `
    <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div style="font-size: 10px; color: #a1a1aa;">
        <p style="margin: 0;">This is a computer-generated document.</p>
        <p style="margin: 0;">Powered by Global Trade Connect</p>
      </div>
      <div style="text-align: center; width: 200px;">
        <div style="height: 60px; border-bottom: 1px solid #e4e4e7; margin-bottom: 10px;"></div>
        <p style="margin: 0; font-size: 12px; font-weight: 700;">Authorized Signatory</p>
        <p style="margin: 0; font-size: 10px; color: #71717a;">For ${COMPANY_DETAILS.name}</p>
      </div>
    </div>
  </div>
`;

const getTable = (items: any[]) => `
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Description</th>
        <th style="padding: 12px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">HS Code</th>
        <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Quantity</th>
        <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Unit Price</th>
        <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px; font-size: 13px; color: #1e293b;">${item.productName || item.description || 'Commodity Product'}</td>
          <td style="padding: 12px; text-align: center; font-size: 13px; color: #475569;">${item.hsCode || '0904'}</td>
          <td style="padding: 12px; text-align: right; font-size: 13px; color: #1e293b;">${item.quantity} ${item.unit}</td>
          <td style="padding: 12px; text-align: right; font-size: 13px; color: #1e293b;">${item.unitPrice || '0.00'}</td>
          <td style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; color: #1e293b;">${item.totalPrice || (item.quantity * (item.unitPrice || 0)).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;

export const generateDocument = (type: DocType, order: ExportOrder): string => {
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const refNo = `${order.orderNumber}-${type.substring(0, 3).toUpperCase()}`;

  switch (type) {
    case 'proformaInvoice':
      return `
        ${getHeader('Proforma Invoice', refNo, date)}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
          <div>
            <h3 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Consignee / Buyer</h3>
            <p style="margin: 0; font-size: 14px; font-weight: 700;">${order.customerName || 'Valued Customer'}</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #475569;">${order.destination || order.destinationCountry || 'International Destination'}</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #475569;">${order.destinationCountry || ''}</p>
          </div>
          <div>
            <h3 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Order Details</h3>
            <p style="margin: 0; font-size: 12px;">Order No: <strong>${order.orderNumber}</strong></p>
            <p style="margin: 2px 0 0; font-size: 12px;">Incoterms: <strong>${order.incoterms || 'FOB'}</strong></p>
            <p style="margin: 2px 0 0; font-size: 12px;">Payment Terms: <strong>${order.paymentTerms || 'T/T 30% Advance, 70% against Docs'}</strong></p>
          </div>
        </div>
        ${getTable(order.items || [{ description: order.commodity || 'Premium Commodities', quantity: order.quantity || 1, unit: order.unit || 'MT', unitPrice: (order.totalAmount || 4500) / (order.quantity || 1), hsCode: order.hsCode || '' }])}
        <div style="text-align: right; margin-top: 20px;">
          <p style="font-size: 16px; font-weight: 800; color: #065f46;">Total Amount: ${order.currency || 'USD'} ${(order.totalAmount || 0).toLocaleString()}</p>
        </div>
        <div style="margin-top: 40px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
          <h4 style="margin: 0 0 10px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Terms & Conditions</h4>
          <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #64748b; line-height: 1.6;">
            <li>Validity: 30 days from the date of invoice.</li>
            <li>Shipment: Within 15 days of order confirmation.</li>
            <li>Bank details will be provided upon request.</li>
          </ul>
        </div>
        ${getFooter()}
      `;

    case 'commercialInvoice':
      return `
        ${getHeader('Commercial Invoice', refNo, date)}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
          <div>
            <h3 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Consignee</h3>
            <p style="margin: 0; font-size: 14px; font-weight: 700;">${order.customerName}</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #475569;">${order.destination}</p>
          </div>
          <div>
            <h3 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Shipping Details</h3>
            <p style="margin: 0; font-size: 12px;">Vessel/Flight: <strong>${order.vesselName || '[VESSEL/FLIGHT]'}</strong></p>
            <p style="margin: 2px 0 0; font-size: 12px;">Port of Loading: <strong>${order.originPort || '[PORT OF LOADING]'}</strong></p>
            <p style="margin: 2px 0 0; font-size: 12px;">Port of Discharge: <strong>${order.destinationPort || order.destination || '[PORT OF DISCHARGE]'}</strong></p>
          </div>
        </div>
        ${getTable(order.items || [{ description: order.commodity, quantity: order.quantity, unit: order.unit, unitPrice: order.totalAmount / order.quantity, hsCode: order.hsCode }])}
        <div style="text-align: right; margin-top: 20px;">
          <p style="font-size: 16px; font-weight: 800; color: #065f46;">FOB Value: ${order.currency} ${order.totalAmount.toLocaleString()}</p>
        </div>
        ${getFooter()}
      `;

    case 'packingList':
      return `
        ${getHeader('Packing List', refNo, date)}
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Consignee</h3>
          <p style="margin: 0; font-size: 14px; font-weight: 700;">${order.customerName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Marks & Nos</th>
              <th style="padding: 12px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Description of Goods</th>
              <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Net Weight</th>
              <th style="padding: 12px; text-align: right; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Gross Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px; font-size: 13px;">${order.orderNumber}/1-50</td>
              <td style="padding: 12px; font-size: 13px;">${order.commodity || '[COMMODITY]'}</td>
              <td style="padding: 12px; text-align: right; font-size: 13px;">${order.quantity || 0} ${order.unit || ''}</td>
              <td style="padding: 12px; text-align: right; font-size: 13px;">${(order.quantity || 0) * 1.02} ${order.unit || ''}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top: 20px; font-size: 12px; color: #475569;">
          <p>Total Packages: <strong>${order.quantity ? Math.ceil(order.quantity / 25) : 0} Bags</strong></p>
          <p>Container No: <strong>${order.containerNumber || '[CONTAINER NO]'}</strong></p>
        </div>
        ${getFooter()}
      `;

    case 'billOfLading':
      return `
        ${getHeader('Bill of Lading', refNo, date)}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; background-color: #e4e4e7; border: 1px solid #e4e4e7;">
          <div style="background-color: white; padding: 15px;">
            <h3 style="font-size: 9px; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;">Shipper</h3>
            <p style="margin: 0; font-size: 11px; font-weight: 700;">${COMPANY_DETAILS.name}</p>
            <p style="margin: 2px 0 0; font-size: 10px; color: #475569;">${COMPANY_DETAILS.address}</p>
          </div>
          <div style="background-color: white; padding: 15px;">
            <h3 style="font-size: 9px; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;">Consignee</h3>
            <p style="margin: 0; font-size: 11px; font-weight: 700;">${order.customerName || 'Valued Customer'}</p>
            <p style="margin: 2px 0 0; font-size: 10px; color: #475569;">${order.destination || order.destinationCountry || 'International Destination'}</p>
          </div>
          <div style="background-color: white; padding: 15px;">
            <h3 style="font-size: 9px; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;">Notify Party</h3>
            <p style="margin: 0; font-size: 11px; font-weight: 700;">SAME AS CONSIGNEE</p>
          </div>
          <div style="background-color: white; padding: 15px;">
            <h3 style="font-size: 9px; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;">Vessel / Voyage</h3>
            <p style="margin: 0; font-size: 11px; font-weight: 700;">${order.vesselName || '[VESSEL/VOYAGE]'}</p>
          </div>
        </div>
        <div style="margin-top: 20px; border: 1px solid #e4e4e7;">
          <div style="background-color: #f8fafc; padding: 10px; border-bottom: 1px solid #e4e4e7; font-size: 10px; font-weight: 700; text-transform: uppercase;">Description of Goods</div>
          <div style="padding: 20px; font-size: 12px; line-height: 1.6;">
            <p><strong>Container No:</strong> ${order.containerNumber || '[CONTAINER NO]'}</p>
            <p><strong>Seal No:</strong> [SEAL NO]</p>
            <p><strong>Goods:</strong> ${order.quantity || 0} ${order.unit || ''} OF ${(order.commodity || '[COMMODITY]').toUpperCase()}</p>
            <p><strong>HS CODE:</strong> ${order.hsCode || '[HS CODE]'}</p>
          </div>
        </div>
        ${getFooter()}
      `;

    case 'certificateOfOrigin':
      return `
        ${getHeader('Certificate of Origin', refNo, date)}
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="font-size: 14px; font-weight: 600; color: #475569;">The undersigned, representing the Chamber of Commerce, Kozhikode, Kerala, India, certifies that the goods described below are of Indian Origin.</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
          <div>
            <h3 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Exporter</h3>
            <p style="margin: 0; font-size: 13px; font-weight: 700;">${COMPANY_DETAILS.name}</p>
          </div>
          <div>
            <h3 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Consignee</h3>
            <p style="margin: 0; font-size: 13px; font-weight: 700;">${order.customerName || 'Valued Customer'}</p>
          </div>
        </div>
        <div style="border: 1px solid #e4e4e7; padding: 20px; border-radius: 8px;">
          <p style="margin: 0; font-size: 12px;"><strong>Description:</strong> ${order.commodity || 'Premium Commodities'}</p>
          <p style="margin: 5px 0 0; font-size: 12px;"><strong>Quantity:</strong> ${order.quantity || 1} ${order.unit || 'MT'}</p>
          <p style="margin: 5px 0 0; font-size: 12px;"><strong>Country of Origin:</strong> INDIA</p>
        </div>
        ${getFooter()}
      `;

    case 'phytosanitaryCertificate':
      return `
        ${getHeader('Phytosanitary Certificate', refNo, date)}
        <div style="text-align: center; margin-bottom: 30px;">
          <h3 style="margin: 0; color: #065f46;">PLANT PROTECTION ORGANIZATION OF INDIA</h3>
          <p style="font-size: 12px; color: #64748b;">TO: PLANT PROTECTION ORGANIZATION OF ${(order.destinationCountry || 'International').toUpperCase()}</p>
        </div>
        <div style="font-size: 12px; line-height: 1.6; color: #1e293b;">
          <p>This is to certify that the plants, plant products or other regulated articles described herein have been inspected and/or tested according to appropriate official procedures and are considered to be free from the quarantine pests specified by the importing contracting party.</p>
          <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <p><strong>Botanical Name:</strong> ${order.commodity || 'Premium Commodities'}</p>
            <p><strong>Quantity:</strong> ${order.quantity || 1} ${order.unit || 'MT'}</p>
            <p><strong>Treatment:</strong> Methyl Bromide Fumigation</p>
            <p><strong>Dosage:</strong> 32g/m3 for 24 hours</p>
          </div>
        </div>
        ${getFooter()}
      `;

    case 'fssaiDeclaration':
      return `
        ${getHeader('FSSAI Export Declaration', refNo, date)}
        <div style="padding: 30px; border: 1px solid #e4e4e7; border-radius: 12px; line-height: 1.8; font-size: 14px;">
          <p>I, the undersigned, on behalf of <strong>${COMPANY_DETAILS.name}</strong>, holding FSSAI License No. <strong>${COMPANY_DETAILS.fssai}</strong>, hereby declare that:</p>
          <ol>
            <li>The food products being exported under Invoice No. ${order.orderNumber} are safe for human consumption.</li>
            <li>The products comply with the standards prescribed under the Food Safety and Standards Act, 2006.</li>
            <li>The manufacturing facility follows Good Manufacturing Practices (GMP) and Good Hygienic Practices (GHP).</li>
          </ol>
          <p style="margin-top: 30px;"><strong>Product:</strong> ${order.commodity || 'Premium Commodities'}</p>
          <p><strong>Batch No:</strong> CST/2026/${order.orderNumber}</p>
        </div>
        ${getFooter()}
      `;

    case 'shippingBill':
      return `
        ${getHeader('Shipping Bill for Export', refNo, date)}
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
          <div style="border: 1px solid #e4e4e7; padding: 10px;">
            <p style="font-size: 9px; color: #94a3b8; margin: 0;">IEC Code</p>
            <p style="font-size: 12px; font-weight: 700; margin: 0;">${COMPANY_DETAILS.iec}</p>
          </div>
          <div style="border: 1px solid #e4e4e7; padding: 10px;">
            <p style="font-size: 9px; color: #94a3b8; margin: 0;">AD Code</p>
            <p style="font-size: 12px; font-weight: 700; margin: 0;">0301234-5678901</p>
          </div>
          <div style="border: 1px solid #e4e4e7; padding: 10px;">
            <p style="font-size: 9px; color: #94a3b8; margin: 0;">PAN</p>
            <p style="font-size: 12px; font-weight: 700; margin: 0;">${COMPANY_DETAILS.pan}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <tr style="border: 1px solid #e4e4e7;">
            <td style="padding: 10px; width: 30%;"><strong>Customs House:</strong></td>
            <td style="padding: 10px;">COCHIN SEA (INCOK1)</td>
          </tr>
          <tr style="border: 1px solid #e4e4e7;">
            <td style="padding: 10px;"><strong>Exporter Name:</strong></td>
            <td style="padding: 10px;">${COMPANY_DETAILS.name}</td>
          </tr>
          <tr style="border: 1px solid #e4e4e7;">
            <td style="padding: 10px;"><strong>Consignee Name:</strong></td>
            <td style="padding: 10px;">${order.customerName || 'Valued Customer'}</td>
          </tr>
        </table>
        ${getFooter()}
      `;

    case 'gstInvoice':
      return `
        ${getHeader('Tax Invoice (GST)', refNo, date)}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
          <div>
            <h3 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Billed To</h3>
            <p style="margin: 0; font-size: 14px; font-weight: 700;">${order.customerName || 'Valued Customer'}</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #475569;">${order.destination || order.destinationCountry || 'International Destination'}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px;">Place of Supply: <strong>KERALA (32)</strong></p>
            <p style="margin: 2px 0 0; font-size: 12px;">Supply Type: <strong>EXPORT UNDER LUT</strong></p>
          </div>
        </div>
        ${getTable(order.items || [{ description: order.commodity, quantity: order.quantity, unit: order.unit, unitPrice: order.totalAmount / order.quantity, hsCode: order.hsCode }])}
        <div style="text-align: right; margin-top: 20px;">
          <p style="font-size: 12px; color: #64748b;">Taxable Value: ${order.currency} ${order.totalAmount.toLocaleString()}</p>
          <p style="font-size: 12px; color: #64748b;">IGST (0% - Export): ${order.currency} 0.00</p>
          <p style="font-size: 18px; font-weight: 800; color: #065f46; margin-top: 10px;">Total Invoice Value: ${order.currency} ${order.totalAmount.toLocaleString()}</p>
        </div>
        ${getFooter()}
      `;

    case 'lcUtilization':
      return `
        ${getHeader('L/C Utilization Advice', refNo, date)}
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <p style="margin: 0; font-size: 13px;"><strong>L/C Number:</strong> [L/C NUMBER]</p>
          <p style="margin: 5px 0 0; font-size: 13px;"><strong>Issuing Bank:</strong> [ISSUING BANK]</p>
          <p style="margin: 5px 0 0; font-size: 13px;"><strong>Advising Bank:</strong> [ADVISING BANK]</p>
        </div>
        <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px;">Documents Presented</h4>
        <ul style="font-size: 13px; color: #1e293b; line-height: 2;">
          <li>[X] Commercial Invoice (Original + 3 Copies)</li>
          <li>[X] Full set of Clean Board Bill of Lading</li>
          <li>[X] Packing List (Original + 3 Copies)</li>
          <li>[X] Certificate of Indian Origin</li>
          <li>[X] Phytosanitary Certificate</li>
        </ul>
        ${getFooter()}
      `;

    case 'qualityCertificate':
      return `
        ${getHeader('Certificate of Quality', refNo, date)}
        <div style="text-align: center; margin-bottom: 30px;">
          <p style="font-size: 14px; font-weight: 600;">LABORATORY ANALYSIS REPORT</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 12px; font-size: 13px; font-weight: 700;">Parameter</td>
            <td style="padding: 12px; font-size: 13px; font-weight: 700; text-align: right;">Result</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px; font-size: 13px;">Moisture Content</td>
            <td style="padding: 12px; font-size: 13px; text-align: right;">--%</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px; font-size: 13px;">Purity Percentage</td>
            <td style="padding: 12px; font-size: 13px; text-align: right;">--%</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px; font-size: 13px;">Extraneous Matter</td>
            <td style="padding: 12px; font-size: 13px; text-align: right;">--% Max</td>
          </tr>
        </table>
        <p style="font-size: 12px; color: #475569; font-style: italic;">The above results are based on samples drawn from Batch CST/2026/${order.orderNumber}.</p>
        ${getFooter()}
      `;

    case 'fumigationCertificate':
      return `
        ${getHeader('Fumigation Certificate', refNo, date)}
        <div style="padding: 30px; border: 1px solid #e4e4e7; border-radius: 12px; line-height: 1.8; font-size: 14px;">
          <p>This is to certify that the cargo described below has been fumigated as per the following details:</p>
          <div style="margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <p><strong>Date of Treatment:</strong> ${date}</p>
            <p><strong>Chemical Used:</strong> Methyl Bromide</p>
            <p><strong>Dosage:</strong> 32 Grams per Cubic Meter</p>
            <p><strong>Duration:</strong> 24 Hours Exposure</p>
            <p><strong>Temperature:</strong> 27 Degrees Celsius</p>
          </div>
          <p><strong>Commodity:</strong> ${order.commodity || '[COMMODITY]'}</p>
          <p><strong>Container No:</strong> ${order.containerNumber || '[CONTAINER NO]'}</p>
        </div>
        ${getFooter()}
      `;

    default:
      return `<h1>Document Template Not Found</h1>`;
  }
};
