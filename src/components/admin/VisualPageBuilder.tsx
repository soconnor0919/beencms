"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Columns2,
  Eye,
  Laptop,
  PanelLeft,
  Redo2,
  RefreshCw,
  Save,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
import type { Block } from "~/lib/blocks";
import {
  commitEditorHistory,
  createEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
} from "~/lib/editor-history";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

const BlockEditor = dynamic(() => import("~/components/admin/BlockEditor"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

type EditorMode = "edit" | "split" | "preview";
type PreviewDevice = "desktop" | "tablet" | "mobile";
export type DraftSaveState = "saved" | "saving" | "unsaved" | "error";

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: "max-w-none",
  tablet: "max-w-[820px]",
  mobile: "max-w-[390px]",
};

const SAVE_LABEL: Record<DraftSaveState, string> = {
  saved: "Draft saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Save failed",
};

export function VisualPageBuilder({
  documentKey,
  initialBlocks,
  previewPath,
  previewVersion,
  saveState,
  onChange,
  onSaveNow,
}: {
  documentKey: string;
  initialBlocks: Block[];
  previewPath: string;
  previewVersion: number;
  saveState: DraftSaveState;
  onChange: (blocks: Block[]) => void;
  onSaveNow: (blocks: Block[]) => void | Promise<void>;
}) {
  const [history, setHistory] = useState(() =>
    createEditorHistory(initialBlocks),
  );
  const [mode, setMode] = useState<EditorMode>("edit");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewReady, setPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setHistory(createEditorHistory(initialBlocks));
  }, [documentKey, initialBlocks]);

  useEffect(() => {
    if (mode === "edit" || previewReady || previewError) return;
    let active = true;
    void fetch("/api/draft/enter", { credentials: "same-origin" }).then(
      (response) => {
        if (!active) return;
        if (response.ok) setPreviewReady(true);
        else setPreviewError(true);
      },
      () => active && setPreviewError(true),
    );
    return () => {
      active = false;
    };
  }, [mode, previewError, previewReady]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void onSaveNow(history.present);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, [contenteditable='true']") ||
        event.key.toLowerCase() !== "z"
      )
        return;
      event.preventDefault();
      const next = event.shiftKey
        ? redoEditorHistory(history)
        : undoEditorHistory(history);
      if (next === history) return;
      setHistory(next);
      onChange(next.present);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history, onChange, onSaveNow]);

  const commit = (blocks: Block[]) => {
    setHistory((current) => commitEditorHistory(current, blocks));
    onChange(blocks);
  };
  const undo = () => {
    const next = undoEditorHistory(history);
    if (next === history) return;
    setHistory(next);
    onChange(next.present);
  };
  const redo = () => {
    const next = redoEditorHistory(history);
    if (next === history) return;
    setHistory(next);
    onChange(next.present);
  };
  const reloadPreview = () => {
    setPreviewError(false);
    setPreviewReady(false);
  };
  const previewUrl = `${previewPath}${previewPath.includes("?") ? "&" : "?"}builderPreview=${previewVersion}`;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={mode}
              onValueChange={(value) => value && setMode(value as EditorMode)}
              aria-label="Editor view"
            >
              <ToggleGroupItem value="edit" aria-label="Edit blocks">
                <PanelLeft />
                Edit
              </ToggleGroupItem>
              <ToggleGroupItem
                value="split"
                aria-label="Split editor and preview"
              >
                <Columns2 />
                Split
              </ToggleGroupItem>
              <ToggleGroupItem value="preview" aria-label="Preview page">
                <Eye />
                Preview
              </ToggleGroupItem>
            </ToggleGroup>
            {mode !== "edit" ? (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={device}
                onValueChange={(value) =>
                  value && setDevice(value as PreviewDevice)
                }
                aria-label="Preview device"
              >
                <ToggleGroupItem value="desktop" aria-label="Desktop preview">
                  <Laptop />
                </ToggleGroupItem>
                <ToggleGroupItem value="tablet" aria-label="Tablet preview">
                  <Tablet />
                </ToggleGroupItem>
                <ToggleGroupItem value="mobile" aria-label="Mobile preview">
                  <Smartphone />
                </ToggleGroupItem>
              </ToggleGroup>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant={saveState === "error" ? "destructive" : "secondary"}
            >
              {SAVE_LABEL[saveState]}
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={undo}
              disabled={!history.past.length}
              aria-label="Undo"
            >
              <Undo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={redo}
              disabled={!history.future.length}
              aria-label="Redo"
            >
              <Redo2 />
            </Button>
            {mode !== "edit" ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={reloadPreview}
                aria-label="Reload preview"
              >
                <RefreshCw />
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={saveState === "saving"}
              onClick={() => void onSaveNow(history.present)}
            >
              <Save data-icon="inline-start" />
              Save draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <div
        className={cn(
          "grid min-w-0 gap-4",
          mode === "split" && "xl:grid-cols-2",
        )}
      >
        {mode !== "preview" ? (
          <div className="min-w-0">
            <BlockEditor blocks={history.present} onChange={commit} />
          </div>
        ) : null}
        {mode !== "edit" ? (
          <div className="min-w-0 overflow-auto rounded-lg border bg-muted p-3">
            <div
              className={cn(
                "mx-auto h-[72vh] min-h-[620px] overflow-hidden rounded-md border bg-background shadow-sm transition-[max-width]",
                DEVICE_WIDTH[device],
              )}
            >
              {previewError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <p className="font-medium">
                    Preview could not be authorized.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewError(false);
                      setPreviewReady(false);
                    }}
                  >
                    Try again
                  </Button>
                </div>
              ) : previewReady ? (
                <iframe
                  key={`${previewUrl}:${previewReady}`}
                  title="Live page preview"
                  src={previewUrl}
                  className="h-full w-full bg-background"
                />
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
