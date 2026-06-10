"use client";
import { FollowUpUpdateComposer } from "./FollowUpUpdateComposer";
import { FollowUpUpdateList } from "./FollowUpUpdateList";
import { useFollowUpStore } from "@/store/useFollowUpStore";
import type { FollowUpItem, FollowUpUpdate } from "@/lib/followup-types";

interface FollowUpUpdatesTabProps {
  item: FollowUpItem;
  updates: FollowUpUpdate[];
  loading: boolean;
}

export function FollowUpUpdatesTab({ item, updates, loading }: FollowUpUpdatesTabProps) {
  const { addItemUpdate } = useFollowUpStore();
  return (
    <div className="flex flex-col">
      <FollowUpUpdateComposer onSubmit={(content) => addItemUpdate(item.id, content)} />
      <FollowUpUpdateList updates={updates} loading={loading} />
    </div>
  );
}
