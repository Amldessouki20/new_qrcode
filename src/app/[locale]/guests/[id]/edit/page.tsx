import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";

import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GuestForm } from "@/components/guests/GuestForm";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, role: true },
  });

  return user;
}

async function getGuest(id: string) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return guest;
  } catch (error) {
    console.error("Error fetching guest:", error);
    return null;
  }
}

export default async function EditGuestPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check permissions
  const canUpdateGuest = await hasPermission(user.id, PERMISSIONS.GUEST_UPDATE);
  if (!canUpdateGuest) {
    redirect(`/${locale}/dashboard`);
  }

  const guest = await getGuest(id);
  if (!guest) {
    notFound();
  }

  const t = await getTranslations({ locale });

  const initialData = {
    id: guest.id,
    name: `${guest.firstName} ${guest.lastName}`,
    identification: guest.nationalId || guest.passportNo || "",
    nationality: guest.nationality || "",
    room: guest.roomNumber || "",
    company: guest.company || "",
    notes: "", // Notes field doesn't exist in schema
    restaurantId: guest.restaurantId || "",
    isActive: guest.isActive,
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/guests`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("guests.back")}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("guests.editGuest")}
            </h1>
            <p className="text-muted-foreground">
              {t("guests.editGuestDescription")}
            </p>
          </div>
        </div>

        <GuestForm initialData={initialData} isEdit={true} />
      </div>
    </DashboardLayout>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    title: t("guests.editGuest"),
    description: t("guests.editGuestDescription"),
  };
}
