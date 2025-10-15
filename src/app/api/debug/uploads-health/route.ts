import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(_request: NextRequest) {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const guestsDir = path.join(uploadsDir, 'guests');

    const result: Record<string, unknown> = {
      uploadsDir,
      guestsDir,
      exists: false,
      readable: false,
      writable: false,
    };

    // Check existence
    const uploadsExists = fs.existsSync(uploadsDir);
    const guestsExists = fs.existsSync(guestsDir);
    result.exists = uploadsExists && guestsExists;

    // Check read/write permissions
    try {
      fs.accessSync(guestsDir, fs.constants.R_OK);
      result.readable = true;
    } catch {
      result.readable = false;
    }

    try {
      fs.accessSync(guestsDir, fs.constants.W_OK);
      result.writable = true;
    } catch {
      result.writable = false;
    }

    return NextResponse.json({
      ok: true,
      message: 'Uploads health check',
      ...result,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}