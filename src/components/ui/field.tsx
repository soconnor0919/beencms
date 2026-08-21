"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" className={cn("flex flex-col gap-6", className)} {...props} />;
}

function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return <legend data-slot="field-legend" className={cn("mb-3 text-base font-medium", className)} {...props} />;
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("group/field-group flex w-full flex-col gap-7", className)} {...props} />;
}

const fieldVariants = cva("group/field flex w-full gap-3", {
  variants: {
    orientation: {
      vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
      horizontal: "flex-row items-center",
      responsive: "flex-col @md/field-group:flex-row @md/field-group:items-center",
    },
  },
  defaultVariants: { orientation: "vertical" },
});

function Field({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return <div role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({ orientation }), className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn("flex w-fit gap-2 leading-snug", className)} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("text-sm font-normal leading-normal text-muted-foreground", className)} {...props} />;
}

export { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet };
