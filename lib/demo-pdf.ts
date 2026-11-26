// Erzeugt ein minimales, gültiges PDF (Helvetica, WinAnsi) mit echtem Textinhalt,
// damit die Demo-"Partnerportal-PDFs" wie reale PDF-Exporte ausgewertet werden.

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, max = 88): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(" ")) {
      if ((line + " " + word).trim().length > max) {
        out.push(line.trim());
        line = word;
      } else line += " " + word;
    }
    if (line.trim()) out.push(line.trim());
  }
  return out;
}

export function buildPdf(title: string, body: string): Buffer {
  const lines = wrap(body);
  let y = 780;
  let content = `BT /F1 15 Tf 56 ${y} Td (${esc(title)}) Tj ET\n`;
  y -= 30;
  for (const l of lines) {
    if (l) content += `BT /F1 10 Tf 56 ${y} Td (${esc(l)}) Tj ET\n`;
    y -= 15;
  }
  const contentBuf = Buffer.from(content, "latin1");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    null, // Content-Stream
  ];

  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets: number[] = [];
  let pos = parts[0].length;
  objects.forEach((obj, i) => {
    offsets.push(pos);
    const buf =
      obj === null
        ? Buffer.concat([
            Buffer.from(`${i + 1} 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n`, "latin1"),
            contentBuf,
            Buffer.from("endstream\nendobj\n", "latin1"),
          ])
        : Buffer.from(`${i + 1} 0 obj\n${obj}\nendobj\n`, "latin1");
    parts.push(buf);
    pos += buf.length;
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(parts);
}
