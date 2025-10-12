"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface ScanRecord {
  id: string;
  cardId: string;
  guestName: string;
  guestNameAr?: string;
  roomNumber?: string;
  company?: string;
  restaurantName: string;
  restaurantNameAr?: string;
  scanTime: Date;
  status: "SUCCESS" | "FAILED" | "WARNING";
  message: string;
  messageAr?: string;
  errorCode?: string;
  usageCount?: number;
  maxUsage?: number;
  validFrom?: Date;
  validTo?: Date;
}

interface AccommodationScanTableProps {
  locale: string;
   refreshKey?: number;
}

export default function AccommodationScanTable({
  locale, refreshKey
}: AccommodationScanTableProps) {
  const t = useTranslations();
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");

  const recordsPerPage = 10;

  const isArabic = locale === "ar";

  // Fetch scan records
  const fetchScanRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        search: searchTerm,
        status: statusFilter === "all" ? "" : statusFilter,
      });

      const response = await fetch(`/api/accommodation/scans?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch scan records");
      }

      const data = await response.json();
      setScanRecords(data.records || []);
      setTotalPages(Math.ceil((data.total || 0) / recordsPerPage));
    } catch (error) {
      console.error("Error fetching scan records:", error);
      setScanRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchTerm]);

useEffect(() => {
  const delayDebounce = setTimeout(() => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  }, 500);

  return () => clearTimeout(delayDebounce);
}, [searchInput]);



  useEffect(() => {
    fetchScanRecords();
  }, [fetchScanRecords]);
   //  Refresh when refreshKey changes
  useEffect(() => {
    if (refreshKey !== undefined) {
      fetchScanRecords();
    }
  }, [refreshKey, fetchScanRecords]);


  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 hover:bg-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("status.success")}
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t("status.failed")}
          </Badge>
        );
      case "WARNING":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            {t("status.warning")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return format(new Date(date), 'PPp');
  };

  // Handle search
  // const handleSearch = (value: string) => {
  //   setSearchTerm(value);
  //   setCurrentPage(1);
  // };

  // Handle status filter
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
            <Input
              placeholder={t("search.placeholder")}
              value={searchInput}
              type="text"
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 "
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t("filter.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all")}</SelectItem>
              <SelectItem value="SUCCESS">{t("status.success")}</SelectItem>
              <SelectItem value="FAILED">{t("status.failed")}</SelectItem>
              <SelectItem value="WARNING">{t("status.warning")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={fetchScanRecords}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {t("search.refresh")}
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table >
          <TableHeader>
            <TableRow  className="text-sm">
              <TableHead>{t("table.guestName")}</TableHead>
              <TableHead>{t("table.company")}</TableHead>
              <TableHead>{t("table.roomNumber")}</TableHead>
              <TableHead>{t("table.restaurant")}</TableHead>
              <TableHead>{t("table.scanTime")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.message")}</TableHead>
              <TableHead>{t("table.usage")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scanRecords.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-4 text-muted-foreground"
                >
                  {t("table.noData")}
                </TableCell>
              </TableRow>
            ) : (
              scanRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="font-medium">
                      {isArabic
                        ? record.guestNameAr || record.guestName
                        : record.guestName}
                    </div>
                    {/* {record.company && (
                      <div className="text-sm text-muted-foreground">
                        {record.company}
                      </div>
                    )} */}
                  </TableCell>
                  <TableCell>{record.company || "-"}</TableCell>
                  <TableCell>{record.roomNumber || "-"}</TableCell>
                  <TableCell>
                    {isArabic
                      ? record.restaurantNameAr || record.restaurantName
                      : record.restaurantName}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(record.scanTime)}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="text-sm">
                        {isArabic
                          ? record.messageAr || record.message
                          : record.message}
                      </div>
                      {record.errorCode && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t("record.errorCode")}: {record.errorCode}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.usageCount !== undefined &&
                    record.maxUsage !== undefined ? (
                      <div className="text-sm">
                        <span
                          className={
                            record.usageCount >= record.maxUsage
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {record.usageCount}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          / {record.maxUsage}
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("pagination.showing", {
              start: (currentPage - 1) * recordsPerPage + 1,
              end: Math.min(currentPage * recordsPerPage, scanRecords.length),
              total: scanRecords.length,
            })}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              {t("pagination.previous")}
            </Button>
            <span className="text-sm">
              {t("pagination.page")} {currentPage} {t("pagination.of")}{" "}
              {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 7 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
