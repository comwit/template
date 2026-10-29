import { action } from "@comwit/state";
import { toast } from "@/lib/components/ui/toast";
import type { ListFilter, LeadView } from "@/lib/course";
import type { DomainActions } from "../types";
import { domain } from "../model";
const csvCell = (value: string | boolean) => {
  const text = typeof value === "boolean" ? (value ? "Y" : "N") : value;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csvHeader = ["이름", "이메일", "연락처", "출처", "신청 항목", "마케팅 동의", "신청일"];
const csvRow = (lead: LeadView) => [
  lead.name,
  lead.email,
  lead.phone,
  lead.sourceLabel,
  lead.itemTitle,
  lead.consent,
  lead.createdLabel,
];
export const manageActions = action<DomainActions>(({ state }) => {
  class Manage {
    private model = state(domain);
    setFilter(filter: Partial<ListFilter>) {
      this.model.filter = { ...this.model.filter, ...filter };
      this.model.page = 1;
    }
    setPage(page: number) {
      this.model.page = page;
    }
    async refresh() {
      await this.model.list.refetch();
    }
    downloadCsv() {
      const items = this.model.list.data.items;
      if (!items.length) {
        toast.error("내려받을 리드가 없습니다.");
        return;
      }
      const lines = [csvHeader, ...items.map(csvRow)].map((row) =>
        row.map(csvCell).join(","),
      );
      // BOM 을 붙여야 엑셀이 한글을 UTF-8 로 연다.
      const blob = new Blob(["﻿" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `leads-${new Date().toISOString().slice(0, 10)}-p${this.model.list.data.page}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`${items.length}건을 CSV 로 내려받았습니다.`);
    }
  }
  return new Manage();
});
