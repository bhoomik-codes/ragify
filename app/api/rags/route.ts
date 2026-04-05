import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRagSchema } from "@/lib/validators";
import { mapRagToDto } from "@/lib/mappers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve exclusively this user's configs
    const rags = await db.rag.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const dtos = rags.map(mapRagToDto);
    return NextResponse.json(dtos);
  } catch (error) {
    console.error("[GET_RAGS_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const result = createRagSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Validate and build payload for database
    const payload = result.data;
    
    const createdRag = await db.rag.create({
      data: {
        ...payload,
        tags: payload.tags ?? [], // Ensure array default for Prisma Json mapping
        userId: session.user.id,
      },
    });

    return NextResponse.json(mapRagToDto(createdRag), { status: 201 });
  } catch (error) {
    console.error("[POST_RAGS_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
