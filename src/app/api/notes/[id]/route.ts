import { NextResponse } from "next/server";

import {
  AdminAuthError,
  assertAdminTokenFromRequest,
} from "@/lib/admin-auth";
import { deleteNote } from "@/lib/notes-service";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    assertAdminTokenFromRequest(request);

    await deleteNote(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}
