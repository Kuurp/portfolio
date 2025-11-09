function doPost(e) {
  try {
    const params = e.parameter;
    
    if (!params || !params.file) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: "No file data found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const folder = DriveApp.getFolderById("1nW4w0wYg4i5BmOcafrBWBVmpdwVO4Ug9");
    
    // Decode base64 and create blob
    const base64Data = params.file;
    const mimeType = params.mimeType || 'image/png';
    
    // Generate filename with timestamp
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const fileName = `drawing_${pad(now.getDate())}_${pad(now.getMonth()+1)}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}.png`;
    
    // Create blob with name
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);

    // Save to Drive
    const file = folder.createFile(blob);
    
    // Send email notification
    const fileUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
    try {
      MailApp.sendEmail(
        "gilles.gonzalezoropeza@gmail.com",
        "New drawing has been sent!",
        `A new drawing has been uploaded to your Google Drive.\n\nFilename: ${fileName}\nView: ${fileUrl}`
      );
    } catch (mailErr) {
      Logger.log("Email error: " + mailErr.message);
    }

    // Return response
    return ContentService
      .createTextOutput(JSON.stringify({
        name: fileName,
        id: file.getId(),
        url: fileUrl
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("Error: " + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}