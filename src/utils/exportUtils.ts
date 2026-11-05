/**
 * Consistent Export Utility supporting CSV, Excel (.xls HTML workbook), and Print/PDF.
 * Respects role-scoped rows passed by the caller.
 */

export function exportDataToFile(
  filenameBase: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
  format: 'csv' | 'excel' | 'pdf'
) {
  if (format === 'csv') {
    const escapeCell = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csvLines = [
      headers.map(escapeCell).join(','),
      ...rows.map((r) => r.map(escapeCell).join(',')),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filenameBase}.csv`);
    return;
  }

  if (format === 'excel') {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><title>${title}</title></head>
      <body>
        <h3>${title}</h3>
        <table border="1" cellpadding="6" cellspacing="0">
          <thead>
            <tr style="background:#141A17;color:#FFFFFF;font-weight:bold;">
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) =>
                  `<tr>${r.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}</tr>`
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    triggerDownload(blob, `${filenameBase}.xls`);
    return;
  }

  if (format === 'pdf') {
    window.print();
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
