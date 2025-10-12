"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteGuestButton } from "./DeleteGuestButton";
import { GuestForm } from "./GuestForm";
import { useTranslations } from "next-intl";
import { Plus, Search, Filter, Users } from "lucide-react";

interface Guest {
  id: string;
  name: string;
  identification: string;
  nationality: string;
  room: string;
  company?: string;
  religion?: string;
  jobTitle?: string;
  restaurantId?: string;
  email?: string;
  phone?: string;
  cardNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GuestManagementProps {
  initialGuests?: Guest[];
}

const GuestManagement: React.FC<GuestManagementProps> = ({
  initialGuests = [],
}) => {
  const t = useTranslations("guests");
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch guests
  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/guests");
      if (response.ok) {
        const data = await response.json();
        setGuests(data.guests || []);
      }
    } catch (error) {
      console.error("Error fetching guests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialGuests.length === 0) {
      fetchGuests();
    }
  }, [initialGuests.length, fetchGuests]);

  // Filter guests based on search term
  const filteredGuests = guests.filter(
    (guest) =>
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phone?.includes(searchTerm) ||
      guest.cardNumber?.includes(searchTerm)
  );

  const handleGuestDeleted = (deletedId: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== deletedId));
  };

  const handleEdit = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedGuest(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t("guests.title")}</h1>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("guests.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {t("guests.filterGuests")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guests List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">
                {t("guests.loading")}
              </p>
            </CardContent>
          </Card>
        ) : filteredGuests.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("guests.noGuests")}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {t("guests.noGuests")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("guests.noGuestsDescription")}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("guests.addFirstGuest")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredGuests.map((guest) => (
            <Card key={guest.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{guest.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={guest.isActive ? "default" : "secondary"}>
                      {guest.isActive
                        ? t("guests.active")
                        : t("guests.inactive")}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(guest)}
                    >
                      {t("guests.edit")}
                    </Button>
                    <DeleteGuestButton
                      guestId={guest.id}
                      guestName={guest.name}
                      onDeleted={handleGuestDeleted}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {guest.email && (
                    <div>
                      <span className="font-medium">{t("guests.email")}:</span>
                      <p className="text-muted-foreground">{guest.email}</p>
                    </div>
                  )}
                  {guest.phone && (
                    <div>
                      <span className="font-medium">{t("guests.phone")}:</span>
                      <p className="text-muted-foreground">{guest.phone}</p>
                    </div>
                  )}
                  {guest.cardNumber && (
                    <div>
                      <span className="font-medium">
                        {t("guests.cardNumber")}:
                      </span>
                      <p className="text-muted-foreground">
                        {guest.cardNumber}
                      </p>
                    </div>
                  )}
                  {guest.religion && (
                    <div>
                      <span className="font-medium">
                        {t("guests.religion")}:
                      </span>
                      <p className="text-muted-foreground">
                        {guest.religion}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {t("guests.createdAt")}:{" "}
                  {new Date(guest.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Guest Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedGuest ? t("guests.editGuest") : t("guests.addGuest")}
            </DialogTitle>
          </DialogHeader>
          <GuestForm
            initialData={
              selectedGuest
                ? {
                    id: selectedGuest.id,
                    name: selectedGuest.name,
                    identification: selectedGuest.identification || "",
                    nationality: selectedGuest.nationality || "",
                    room: selectedGuest.room || "",
                    company: selectedGuest.company || "",
                    
                    restaurantId: selectedGuest.restaurantId || "",
                    restaurantType: "",
                    isActive: selectedGuest.isActive,
                  }
                : undefined
            }
            isEdit={!!selectedGuest}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestManagement;
