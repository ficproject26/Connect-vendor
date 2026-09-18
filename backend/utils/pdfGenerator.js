/**
 * Pure JavaScript Valid PDF 1.4 Generator
 * Generates a clean, professional Candidate Resume document
 * without external dependencies.
 */
function escapePdfText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function generateCandidateResumePdf(data) {
  const {
    candidateName = 'Candidate',
    candidateEmail = 'N/A',
    candidatePhone = 'N/A',
    jobTitle = 'Job Applicant',
    candidateEducation = 'Graduate',
    experience = 'Fresher',
    jobLocation = 'N/A',
    applicationId = 'N/A',
    applicationDate = new Date().toISOString().substring(0, 10),
    status = 'APPLICATION RECEIVED'
  } = data;

  const formattedDate = (() => {
    try {
      const d = new Date(applicationDate);
      return isNaN(d.getTime()) ? String(applicationDate).substring(0, 10) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(applicationDate).substring(0, 10);
    }
  })();

  // Page dimensions: 595.28 x 841.89 (A4 in points)
  const streamCommands = [
    'q',
    // Header background banner (Navy Blue: #0B3C7B -> 0.043 0.235 0.482)
    '0.043 0.235 0.482 rg',
    '36 740 523 70 re',
    'f',

    // White Header Title
    'BT',
    '/F2 20 Tf',
    '1 1 1 rg',
    '56 782 Td',
    `(${escapePdfText(candidateName.toUpperCase())}) Tj`,
    'ET',

    // Header Subtitle
    'BT',
    '/F1 11 Tf',
    '0.9 0.95 1 rg',
    '56 757 Td',
    `(Role Applied: ${escapePdfText(jobTitle)}   |   Application ID: #${escapePdfText(applicationId)}) Tj`,
    'ET',

    // Decorative Accent Line (FIC Golden Yellow: 0.98 0.93 0.15)
    '0.98 0.93 0.15 rg',
    '36 737 523 3 re',
    'f',

    // Section 1: Contact Information Box
    '0.96 0.97 0.99 rg',
    '36 670 523 50 re',
    'f',
    '0.85 0.88 0.93 RG',
    '0.75 w',
    '36 670 523 50 re',
    'S',

    'BT',
    '/F2 10 Tf',
    '0.1 0.15 0.2 rg',
    '50 702 Td',
    '(EMAIL ADDRESS:) Tj',
    '/F1 10 Tf',
    '0.2 0.3 0.5 rg',
    '150 702 Td',
    `(${escapePdfText(candidateEmail)}) Tj`,
    'ET',

    'BT',
    '/F2 10 Tf',
    '0.1 0.15 0.2 rg',
    '50 682 Td',
    '(PHONE NUMBER:) Tj',
    '/F1 10 Tf',
    '0.2 0.3 0.5 rg',
    '150 682 Td',
    `(${escapePdfText(candidatePhone)}) Tj`,
    'ET',

    // Section 2: Professional Profile & Application Details Header
    'BT',
    '/F2 13 Tf',
    '0.043 0.235 0.482 rg',
    '36 640 Td',
    '(CANDIDATE APPLICATION PROFILE) Tj',
    'ET',

    // Underline for section header
    '0.8 0.85 0.9 rg',
    '36 633 523 1 re',
    'f',

    // Row 1: Position
    'BT',
    '/F2 10 Tf',
    '0.2 0.25 0.3 rg',
    '46 610 Td',
    '(Target Role / Position:) Tj',
    '/F1 10 Tf',
    '0.05 0.1 0.2 rg',
    '180 610 Td',
    `(${escapePdfText(jobTitle)}) Tj`,
    'ET',

    // Row 2: Education
    'BT',
    '/F2 10 Tf',
    '0.2 0.25 0.3 rg',
    '46 580 Td',
    '(Highest Qualification:) Tj',
    '/F1 10 Tf',
    '0.05 0.1 0.2 rg',
    '180 580 Td',
    `(${escapePdfText(candidateEducation)}) Tj`,
    'ET',

    // Row 3: Experience
    'BT',
    '/F2 10 Tf',
    '0.2 0.25 0.3 rg',
    '46 550 Td',
    '(Total Work Experience:) Tj',
    '/F1 10 Tf',
    '0.05 0.1 0.2 rg',
    '180 550 Td',
    `(${escapePdfText(experience)}) Tj`,
    'ET',

    // Row 4: Preferred Location
    'BT',
    '/F2 10 Tf',
    '0.2 0.25 0.3 rg',
    '46 520 Td',
    '(Preferred Location:) Tj',
    '/F1 10 Tf',
    '0.05 0.1 0.2 rg',
    '180 520 Td',
    `(${escapePdfText(jobLocation)}) Tj`,
    'ET',

    // Row 5: Application Date
    'BT',
    '/F2 10 Tf',
    '0.2 0.25 0.3 rg',
    '46 490 Td',
    '(Application Date:) Tj',
    '/F1 10 Tf',
    '0.05 0.1 0.2 rg',
    '180 490 Td',
    `(${escapePdfText(formattedDate)}) Tj`,
    'ET',

    // Row 6: Application Status
    'BT',
    '/F2 10 Tf',
    '0.2 0.25 0.3 rg',
    '46 460 Td',
    '(Current Status:) Tj',
    '/F2 10 Tf',
    '0.05 0.5 0.3 rg',
    '180 460 Td',
    `(${escapePdfText(status.toUpperCase())}) Tj`,
    'ET',

    // Section 3: Document Verification Note Box
    '0.97 0.98 1 rg',
    '36 340 523 90 re',
    'f',
    '0.8 0.85 0.92 RG',
    '0.5 w',
    '36 340 523 90 re',
    'S',

    'BT',
    '/F2 10 Tf',
    '0.043 0.235 0.482 rg',
    '50 405 Td',
    '(VERIFIED APPLICANT DOCUMENT RECORD) Tj',
    '/F1 9 Tf',
    '0.3 0.35 0.4 rg',
    '50 388 Td',
    '(This verified candidate document was submitted via the Connect portal. All information provided has) Tj',
    '50 373 Td',
    '(been registered and synchronized with the Vendor recruitment management system.) Tj',
    '/F2 9 Tf',
    '0.15 0.2 0.35 rg',
    '50 353 Td',
    `(${escapePdfText('Document Reference: ' + (data.filename || applicationId + '.pdf'))}) Tj`,
    'ET',

    // Footer
    'BT',
    '/F1 8 Tf',
    '0.5 0.55 0.6 rg',
    '36 40 Td',
    `(FIC Connect Vendor Portal  |  Recruitment & Candidate Management  |  Generated ${escapePdfText(formattedDate)}) Tj`,
    'ET',
    'Q'
  ];

  const streamContent = streamCommands.join('\n');
  const streamLength = Buffer.byteLength(streamContent);

  const objects = [];
  // 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  // 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  // 3: Page
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj');
  // 4: Contents
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`);
  // 5: Font Helvetica
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  // 6: Font Helvetica-Bold
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  let body = '%PDF-1.4\n';
  const xref = [0];
  for (let i = 0; i < objects.length; i++) {
    xref.push(Buffer.byteLength(body));
    body += objects[i] + '\n';
  }

  const xrefStart = Buffer.byteLength(body);
  body += 'xref\n';
  body += `0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    body += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
  }

  body += 'trailer\n';
  body += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += 'startxref\n';
  body += `${xrefStart}\n`;
  body += '%%EOF\n';

  return Buffer.from(body, 'utf-8');
}

module.exports = {
  generateCandidateResumePdf
};
