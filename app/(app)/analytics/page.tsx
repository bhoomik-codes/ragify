import React from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { mapRagToDto } from "@/lib/mappers";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rags = await db.rag.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return <AnalyticsClient rags={rags.map(mapRagToDto)} />;
}

