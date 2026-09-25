import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function splitDateTime(raw: string): [string, string] {
  const clean = raw.replace(/Z$/, "").split(".")[0]
  const sep = clean.indexOf("T") >= 0 ? "T" : " "
  const idx = clean.indexOf(sep)
  return idx >= 0 ? [clean.slice(0, idx), clean.slice(idx + 1)] : [clean, ""]
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—"
  const [datePart] = splitDateTime(dateString)
  const parts = datePart.split("-")
  if (parts.length !== 3) return dateString
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
