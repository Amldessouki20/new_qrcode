"use client";

import { useState, useEffect,useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useLocale } from "next-intl";
import { MealTimesManager } from "@/components/restaurants/MealTimesManager";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Gate } from "@/lib/types/api";
import { createRestaurantSchema } from "@/lib/validations/restaurants";

type RestaurantFormData = z.infer<typeof createRestaurantSchema>;



interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  restaurantType: string;
  gateId?: string | null;
  gate?: Gate | null;
  isActive?: boolean;
  mealTimes?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }[];
}

interface RestaurantFormProps {
  mode: "create" | "edit";
  restaurant?: Restaurant;
}

// Update the Gate interface to match API response
interface GateFromAPI {
  id: string;
  name: string;
  nameAr: string;
  type: {
    id: string;
    name: string;
  };
  location: string;
  ipAddress?: string | null;
  port?: number | null;
  isActive: boolean;
  defaultProtocol?: {
    id: string;
    name: string;
  } | null;
  restaurants: Array<{
    id: string;
    name: string;
    nameAr?: string;
    location?: string;
  }>;
  _count: {
    restaurants: number;
    accessLogs: number;
  };
}

export function RestaurantForm({ mode, restaurant }: RestaurantFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gates, setGates] = useState<GateFromAPI[]>([]);
  const [loadingGates, setLoadingGates] = useState(false);

  // Default values function
  const getDefaultValues = (): RestaurantFormData => ({
    name: "",
    description: "",
    location: "",
    capacity: 1,
    isActive: true,
    restaurantType: "",
    gateId: "",
    mealTimes: [
      {
        name: "breakfast",
        startTime: "07:00",
        endTime: "10:00",
        isActive: true,
      },
      {
        name: "lunch",
        startTime: "12:00",
        endTime: "15:00",
        isActive: true,
      },
      {
        name: "dinner",
        startTime: "18:00",
        endTime: "22:00",
        isActive: true,
      },
    ],
  });

  // Create form configuration based on whether we have restaurant data
  const form = useForm({
    resolver: zodResolver(createRestaurantSchema),
    mode: "onChange" as const,
    defaultValues: restaurant ? {
      name: restaurant.name || "",
      description: restaurant.description || "",
      location: restaurant.location || "",
      capacity: restaurant.capacity || 1,
      isActive: restaurant.isActive ?? true,
      restaurantType: restaurant.restaurantType || "",
      gateId: restaurant.gateId || "",
      mealTimes:
        restaurant.mealTimes && restaurant.mealTimes.length > 0
          ? restaurant.mealTimes.map((mt) => ({
              name: mt.name || "breakfast",
              startTime: mt.startTime || "07:00",
              endTime: mt.endTime || "10:00",
              isActive: mt.isActive ?? true,
            }))
          : getDefaultValues().mealTimes,
    } : getDefaultValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "mealTimes",
  });

  // Fetch gates for selection
  const fetchGates = useCallback(async () => {
    setLoadingGates(true);
    try {
      const response = await fetch("/api/gates?limit=100", {
        method: "GET",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.gates && Array.isArray(data.gates)) {
          setGates(data.gates);
        } else {
          setGates([]);
        }
      } else {
        setGates([]);
      }
    } catch {
      setGates([]);
    } finally {
      setLoadingGates(false);
    }
  }, [setLoadingGates, setGates]);

  useEffect(() => {
    fetchGates();
  }, [fetchGates]);

  // Add window focus listener to refresh gates when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      fetchGates();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchGates]);

  const onSubmit: SubmitHandler<RestaurantFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      // Convert "none" to undefined for gateId to match API schema
      const processedData = {
        ...data,
        gateId: data.gateId === "none" ? undefined : data.gateId,
      };

      const url =
        mode === "create"
          ? "/api/restaurants"
          : `/api/restaurants/${restaurant?.id}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      });

      if (response.ok) {
        await response.json();
        toast.success(
          mode === "create"
            ? t("restaurants.createSuccess")
            : t("restaurants.updateSuccess")
        );
        router.push(`/${locale}/restaurants`);
      } else {
        let errorMessage = t("restaurants.saveError");
        try {
          const errorText = await response.text();
          
          if (errorText) {
            try {
              const error = JSON.parse(errorText);
              errorMessage = error.message || error.error || errorMessage;
            } catch {
              errorMessage = errorText || `Server error: ${response.status} ${response.statusText}`;
            }
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        toast.error(errorMessage);
      }
    } catch (error: unknown) {
      let errorMessage = t("restaurants.saveError");
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        errorMessage =
          "Network error: Unable to connect to server. Please check your connection.";
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 overflow-hidden mx-auto max-w-1xl w-full  text-ms  ">
      <Card className="p-2 bg-slate-50 shadow-sm text-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {mode === "create" ? t("restaurants.basic") : t("restaurants.edit")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("restaurants.basicDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-2 text-base "
            >
              <div className="grid gap-2 md:grid-cols-2">
                <FormField
                control={form.control}
                name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("restaurants.name")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-8 text-sm px-2 max-w-xs"
                          placeholder={t("restaurants.namePlaceholder")}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("restaurants.capacity")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-8 text-sm px-2 max-w-xs"
                          type="number"
                          placeholder={t("restaurants.enterCapacity")}
                          value={field.value?.toString() || "1"}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              field.onChange(1); // Use minimum valid capacity
                            } else {
                              const numValue = parseInt(value, 10);
                              field.onChange(isNaN(numValue) ? 1 : Math.max(1, numValue));
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t("restaurants.capacityDescription")}
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("restaurants.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("restaurants.descriptionPlaceholder")}
                        className=" h-20 text-sm"
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-2 md:grid-cols-3">
                <FormField
                control={form.control}
                name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("restaurants.location")}</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8 text-sm px-2 max-w-xs"
                          placeholder={t("restaurants.locationPlaceholder")}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="restaurantType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("restaurants.restaurantType")}</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8 text-sm px-2 max-w-xs"
                          placeholder={t("restaurants.enterRestaurantType")}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="gateId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm">
                          {t("restaurants.gate")}
                        </FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={fetchGates}
                          disabled={loadingGates}
                          className="h-6 px-2 text-xs"
                        >
                          <RefreshCw className={`h-3 w-3 ${loadingGates ? 'animate-spin' : ''}`} />
                          <span className="ml-1">تحديث</span>
                        </Button>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                          value={field.value || "none"}
                        >
                          <SelectTrigger className="h-8 text-sm px-2 max-w-xs">
                            <SelectValue
                              placeholder={
                                loadingGates
                                  ? t("common.loading")
                                  : t("restaurants.selectGate")
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {t("restaurants.noGate")}
                            </SelectItem>
                            {loadingGates ? (
                              <SelectItem value="loading" disabled>
                                {t("common.loading")}...
                              </SelectItem>
                            ) : gates.length === 0 ? (
                              <SelectItem value="no-gates" disabled>
                                لا توجد بوابات متاحة
                              </SelectItem>
                            ) : (
                              gates.filter((gate) => gate.isActive && gate.id).map((gate) => (
                                <SelectItem key={gate.id} value={gate.id}>
                                  {locale === "ar" && gate.nameAr ? gate.nameAr : gate.name}
                                  {gate.location ? ` - ${gate.location}` : ""}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        {t("restaurants.gateDescription")} ({gates.filter(g => g.isActive).length} بوابة متاحة)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-2" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">
                      {t("restaurants.mealTimesSection")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("restaurants.mealTimesSectionDescription")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        name: "breakfast",
                        startTime: "07:00",
                        endTime: "10:00",
                        isActive: true,
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("restaurants.addMealTime")}
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <FormField
                              control={form.control}
                              name={`mealTimes.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                {t("mealTimes.title")}
                              </FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value || "breakfast"}
                                >
                                  <SelectTrigger className="h-8 text-sm px-2">
                                    <SelectValue
                                      placeholder={t(
                                        "mealTimes.selectMealType"
                                      )}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="breakfast">
                                      {t("restaurants.breakfast")}
                                    </SelectItem>
                                    <SelectItem value="lunch">
                                      {t("restaurants.lunch")}
                                    </SelectItem>
                                    <SelectItem value="dinner">
                                      {t("restaurants.dinner")}
                                    </SelectItem>
                                    <SelectItem value="fullboard">
                                      {t("restaurants.fullboard")}
                                    </SelectItem>
                                    <SelectItem value="halfboard">
                                      {t("restaurants.halfboard")}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                            control={form.control}
                            name={`mealTimes.${index}.startTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("mealTimes.startTime")}</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-8 text-sm px-2"
                                  type="time"
                                  value={field.value || "07:00"}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                            control={form.control}
                            name={`mealTimes.${index}.endTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("mealTimes.endTime")}</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-8 text-sm px-2"
                                  type="time"
                                  value={field.value || "10:00"}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name={`mealTimes.${index}.isActive`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={Boolean(field.value)}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm">
                                  {t("common.active")}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator className="my-2" />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t("restaurants.activeStatus")}
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={Boolean(field.value)}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/${locale}/restaurants`)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? t("common.saving")
                    : mode === "create"
                    ? t("restaurants.createRestaurant")
                    : t("restaurants.updateRestaurant")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {mode === "edit" && restaurant && (
        <>
          <Separator />
          <MealTimesManager restaurantId={restaurant.id} />
        </>
      )}
    </div>
  );
}

export default RestaurantForm;


