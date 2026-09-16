import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_ORDER,
  TRANSACTION_TYPE_SYMBOLS,
} from "@/lib/transaction-type";

export default function TypesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Types</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TRANSACTION_TYPE_ORDER.map((kind) => (
            <TableRow key={kind}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-4 shrink-0 justify-center text-muted-foreground" aria-hidden="true">
                    {TRANSACTION_TYPE_SYMBOLS[kind]}
                  </span>
                  <span>{TRANSACTION_TYPE_LABELS[kind]}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
