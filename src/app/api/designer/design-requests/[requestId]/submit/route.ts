import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const designerId = request.cookies.get("designer_id")?.value;

    if (!designerId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Validate designer (CMS designers serve all customer teams)
    const designers = await query(
      "SELECT id FROM designer_accounts WHERE id = $1 AND active = true",
      [designerId]
    );

    if (designers.length === 0) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    // Verify design request exists
    const requests = await query(
      "SELECT id FROM design_requests WHERE id = $1",
      [requestId]
    );

    if (requests.length === 0) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const submissionNotes = formData.get("submission_notes") as string || "";
    const files = formData.getAll("files") as File[];

    // Get next version number
    const submissions = await query(
      `SELECT MAX(version_number) as max_version 
       FROM design_submissions 
       WHERE design_request_id = $1`,
      [requestId]
    );

    const versionNumber = (submissions[0]?.max_version || 0) + 1;

    // Create submission record
    const submissionId = uuidv4();
    await query(
      `INSERT INTO design_submissions 
       (id, design_request_id, designer_id, version_number, status, submission_notes, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [submissionId, requestId, designerId, versionNumber, "pending", submissionNotes]
    );

    // Handle file uploads
    let filesUploaded = 0;
    if (files.length > 0) {
      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "submissions",
        submissionId
      );

      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      for (const file of files) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Generate unique filename
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          const ext = path.extname(file.name);
          const basename = path.basename(file.name, ext);
          const filename = `${basename}-${timestamp}-${random}${ext}`;

          const filepath = path.join(uploadDir, filename);
          await writeFile(filepath, buffer);

          // Insert file record
          const fileId = uuidv4();
          await query(
            `INSERT INTO design_submission_files 
             (id, design_submission_id, filename, file_path, file_size, mime_type, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              fileId,
              submissionId,
              filename,
              `/uploads/submissions/${submissionId}/${filename}`,
              file.size,
              file.type,
            ]
          );

          filesUploaded++;
        } catch (err) {
          console.error(`Error uploading file ${file.name}:`, err);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        submissionId,
        versionNumber,
        filesUploaded},
      { status: 201 }
    );
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit design"},
      { status: 500 }
    );
  }
}
