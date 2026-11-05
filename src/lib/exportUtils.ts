import * as XLSX from 'xlsx';
import { PayrollRecord, DocumentVaultItem } from '../types/hrms';

export type ExportFormat = 'XLSX' | 'CSV' | 'EXCEL_TSV' | 'JSON' | 'PRINT_PDF';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printHtmlViaHiddenIframe(htmlContent: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 250);
  }
}

export function exportDataToFormat<T extends Record<string, any>>(
  data: T[],
  filename: string,
  format: ExportFormat,
  title = 'Argos Watch HRMS Report'
) {
  const safeData =
    data && data.length > 0
      ? data
      : ([{ Note: 'No records found for the selected filter / report period' }] as unknown as T[]);

  const headers = Object.keys(safeData[0]);

  if (format === 'XLSX') {
    exportToExcelXLSX(safeData, filename, title.slice(0, 30));
    return;
  }

  if (format === 'JSON') {
    const blob = new Blob([JSON.stringify(safeData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    triggerDownload(blob, `${filename}.json`);
    return;
  }

  if (format === 'CSV' || format === 'EXCEL_TSV') {
    const sep = format === 'CSV' ? ',' : '\t';
    const ext = format === 'CSV' ? 'csv' : 'xls';
    const rows = safeData.map((row) =>
      headers
        .map((h) => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(sep)
    );
    const content = [headers.join(sep), ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filename}.${ext}`);
    return;
  }

  if (format === 'PRINT_PDF') {
    const tableRows = safeData
      .map(
        (row) =>
          `<tr>${headers
            .map(
              (h) =>
                `<td style="border:1px solid #CBCBCB;padding:8px 10px;font-size:11px;color:#141A17;">${
                  row[h] ?? '—'
                }</td>`
            )
            .join('')}</tr>`
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #141A17; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p { font-size: 11px; color: #525854; margin-top: 0; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #F2F2F2; border: 1px solid #CBCBCB; padding: 8px 10px; font-size: 10px; text-transform: uppercase; text-align: left; color: #525854; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Argos Watch Precision Manufacturing Pvt. Ltd. • Generated on ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;
    printHtmlViaHiddenIframe(html);
  }
}

export function printPayslipDocument(slip: PayrollRecord) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payslip - ${slip.employeeName} (${slip.month})</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 32px; color: #141A17; }
          .box { border: 1px solid #CBCBCB; border-radius: 12px; padding: 24px; max-width: 680px; margin: 0 auto; }
          .header { border-bottom: 1px solid #CBCBCB; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; border-bottom: 1px dashed #F2F2F2; }
          .total { background: #141A17; color: #F2F2F2; padding: 14px 18px; border-radius: 8px; margin-top: 18px; display: flex; justify-content: space-between; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="header">
            <div>
              <h2 style="margin:0;font-size:18px;">Argos Watch Precision Manufacturing Pvt. Ltd.</h2>
              <p style="margin:4px 0 0;font-size:11px;color:#525854;">Official Monthly Salary Advice • ${slip.month}</p>
            </div>
            <div style="text-align:right;font-size:12px;">
              <strong>${slip.employeeName}</strong><br/>
              <span>${slip.employeeCode} • ${slip.designation}</span>
            </div>
          </div>
          <div class="row"><span>Department</span><strong>${slip.department}</strong></div>
          <div class="row"><span>Paid Days / LOP Days</span><strong>${slip.paidDays} Days / ${slip.lopDays} LOP</strong></div>
          <div class="row"><span>Basic Pay</span><strong>₹${(slip.basicPay ?? 0).toLocaleString('en-IN')}</strong></div>
          <div class="row"><span>HRA</span><strong>₹${(slip.hra ?? 0).toLocaleString('en-IN')}</strong></div>
          <div class="row"><span>Special Allowance</span><strong>₹${(slip.specialAllowance ?? 0).toLocaleString('en-IN')}</strong></div>
          <div class="row"><span>Gross Monthly Earnings</span><strong>₹${(slip.grossMonthly ?? 0).toLocaleString('en-IN')}</strong></div>
          <div class="row"><span>PF + Professional Tax + TDS</span><strong>-₹${((slip.pfDeduction ?? 0) + (slip.professionalTax ?? 0) + (slip.tdsDeduction ?? 0)).toLocaleString('en-IN')}</strong></div>
          <div class="row"><span>Late Arrival / LOP Penalty</span><strong>-₹${(slip.latePenaltyDeduction ?? 0).toLocaleString('en-IN')}</strong></div>
          <div class="total">
            <span>Net Bank Disbursement</span>
            <span>₹${(slip.netPayable ?? 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </body>
    </html>
  `;
  printHtmlViaHiddenIframe(html);
}

export function printVerificationCertificate(docItem: DocumentVaultItem) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Document Verification - ${docItem.title}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 32px; color: #141A17; }
          .cert { border: 2px solid #4E1617; border-radius: 12px; padding: 28px; max-width: 640px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="cert">
          <h2 style="margin:0 0 6px;">Argos Watch — HR Compliance Verification Certificate</h2>
          <p style="font-size:12px;color:#525854;margin:0 0 20px;">Document Vault Reference: ${docItem.id}</p>
          <p style="font-size:13px;line-height:1.6;">
            This certifies that the document <strong>"${docItem.title}"</strong> (${docItem.category}) belonging to
            <strong>${docItem.employeeName}</strong> (${docItem.department}) was uploaded on <strong>${docItem.uploadedOn}</strong>
            and holds current verification status: <strong>${docItem.status}</strong>.
          </p>
        </div>
      </body>
    </html>
  `;
  printHtmlViaHiddenIframe(html);
}

export function printOfficialLetter(params: {
  letterType?: string;
  templateType?: string;
  employeeName?: string;
  recipientName?: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  annualCTC?: number;
  effectiveDate?: string;
  customRemarks?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  issuedBy?: string;
  subject?: string;
  content?: string;
  [key: string]: any;
}) {
  const targetName = params.employeeName || params.recipientName || 'Employee';
  const effectiveType = params.letterType || params.templateType || 'Official';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${effectiveType} Letter - ${targetName}</title>
        <style>
          body { font-family: Georgia, serif; padding: 40px; color: #141A17; line-height: 1.7; }
          .sheet { max-width: 680px; margin: 0 auto; border: 1px solid #CBCBCB; padding: 36px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <h2 style="margin:0;">ARGOS WATCH PRECISION MANUFACTURING PVT. LTD.</h2>
          <p style="font-size:12px;color:#525854;margin-top:4px;">Surat Horology Atelier & Corporate Office • Date: ${params.effectiveDate || new Date().toISOString().slice(0, 10)}</p>
          <hr style="border:0;border-top:1px solid #CBCBCB;margin:20px 0;" />
          <p><strong>To:</strong> ${params.employeeName || 'Staff Member'} (${params.employeeCode || params.employeeId || 'EMP'})<br/>
          <strong>Designation:</strong> ${params.designation || 'Staff'} — ${params.department || 'Operations'}</p>
          <h3 style="margin-top:24px;">Subject: ${params.subject || `Official ${effectiveType} Letter`}</h3>
          <p>Dear ${params.employeeName || 'Colleague'},</p>
          <div style="white-space: pre-line; margin: 16px 0;">${params.content || params.customRemarks || 'This letter serves as formal correspondence.'}</div>
          <p>Your recorded date of joining with Argos Watch is <strong>${params.joiningDate || 'N/A'}</strong>.</p>
          <p style="margin-top:36px;">Sincerely,<br/>
          <strong>${params.signatoryName || params.issuedBy || 'Human Resources Team'}</strong><br/>
          <span style="font-size:12px;color:#525854;">${params.signatoryTitle || 'Head of People & Culture'}</span></p>
        </div>
      </body>
    </html>
  `;
  printHtmlViaHiddenIframe(html);
}

export function exportTableToCSV<T extends Record<string, any>>(data: T[], filename: string) {
  exportDataToFormat(data, filename, 'CSV');
}

export function exportTableToJSON<T extends Record<string, any>>(data: T[], filename: string) {
  exportDataToFormat(data, filename, 'JSON');
}

function applyWorksheetFormatting(ws: XLSX.WorkSheet, validData: Record<string, any>[]) {
  const keys = Object.keys(validData[0]);
  const colWidths = keys.map((key) => {
    let maxLen = key.length;
    validData.slice(0, 150).forEach((item) => {
      const val = item[key] !== null && item[key] !== undefined ? String(item[key]) : '';
      if (val.length > maxLen) maxLen = Math.min(val.length, 44);
    });
    return { wch: Math.max(maxLen + 4, 14) };
  });
  ws['!cols'] = colWidths;

  if (ws['!ref']) {
    ws['!autofilter'] = { ref: ws['!ref'] };
  }

  // Freeze top header row in Excel
  (ws as any)['!freeze'] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: 'A2',
    activePane: 'bottomLeft',
    state: 'frozen',
  };
  (ws as any)['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

export function exportToExcelXLSX<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName = 'Report'
) {
  const validData =
    data && data.length > 0
      ? data
      : ([{ Note: 'No records found for the selected period' }] as unknown as T[]);
  const safeSheetName = sheetName.replace(/[\/?*[\]]/g, '').slice(0, 31) || 'Report';
  const ws = XLSX.utils.json_to_sheet(validData);
  applyWorksheetFormatting(ws, validData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportMultiSheetExcelXLSX(
  sheets: { sheetName: string; data: Record<string, any>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ sheetName, data }) => {
    const safeName = sheetName.replace(/[\/?*[\]]/g, '').slice(0, 31) || 'Sheet';
    const validData =
      data && data.length > 0
        ? data
        : [{ Note: 'No records found for the selected period' }];
    const ws = XLSX.utils.json_to_sheet(validData);
    applyWorksheetFormatting(ws, validData);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

