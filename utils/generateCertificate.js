const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { fromPath } = require("pdf2pic");

async function generateCertificate(user) {
  return new Promise((resolve, reject) => {
    const certDir = path.join(__dirname, "../uploads/certificates");
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    const fileName = `${user._id}-certificate.pdf`;
    const pdfPath = path.join(certDir, fileName);

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 50,
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#fdf6e3");
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke("#333");

    doc
      .fontSize(30)
      .fillColor("#2c3e50")
      .text("Certificate of Participation", { align: "center", underline: true });

    doc.moveDown(2);
    doc
      .fontSize(22)
      .fillColor("#000")
      .text(`This is proudly presented to:`, { align: "center" });

    doc.moveDown(1);
    doc
      .fontSize(28)
      .fillColor("#e74c3c")
      .text(user.name, { align: "center", bold: true });

    doc.moveDown(1.5);
    doc
      .fontSize(18)
      .fillColor("#000")
      .text(
        `For participating as ${user.designation} in ${user.city}, ${user.state}`,
        { align: "center" }
      );

    doc.moveDown(3);
    doc.fontSize(14).text(`Date: ${new Date().toLocaleDateString()}`, 100, 450);
    doc.fontSize(14).text(`Authorized Signature`, 600, 450);

    // QR code if exists
    if (user.qrCodeImage) {
      try {
        const qrPath = path.join(
          __dirname,
          "../uploads/qrcodes",
          path.basename(user.qrCodeImage)
        );
        if (fs.existsSync(qrPath)) {
          doc.image(qrPath, 50, 300, { width: 100 });
        }
      } catch (err) {
        console.error("QR code image not found:", err.message);
      }
    }

    doc.end();

    stream.on("finish", async () => {
      try {
        // Convert to image using pdf2pic
        const converter = fromPath(pdfPath, {
          density: 150,
          saveFilename: `${user._id}-certificate`,
          savePath: certDir,
          format: "png",
          width: 1200,
          height: 900,
        });

        const result = await converter(1); // convert first page only
        const imagePath = `/uploads/certificates/${path.basename(result.path)}`;

        resolve({
          pdf: `/uploads/certificates/${fileName}`,
          image: imagePath,
        });
      } catch (err) {
        reject(err);
      }
    });

    stream.on("error", reject);
  });
}

module.exports = generateCertificate;
