import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { Expense, ExpenseCategory } from "@/types/expense";
import type { Trip } from "@/types/trip";

const categories: ExpenseCategory[] = [
  "Toll",
  "Parking",
  "Detention",
  "Loading / Unloading Support",
  "Emergency Repair",
  "Miscellaneous",
];

export function ExpenseForm({
  trip,
  onSubmit,
}: {
  trip: Trip;
  onSubmit: (expense: Expense) => void;
}) {
  const [category, setCategory] = useState<ExpenseCategory>("Toll");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const receiptRequired = Number(amount) > 500;
  const valid =
    Number(amount) > 0 &&
    Boolean(category) &&
    (category !== "Miscellaneous" || description.trim().length > 0);

  return (
    <div className="stack">
      <div className="grid-2">
        <label>
          <span className="field-label">Trip</span>
          <Input value={trip.id} disabled />
        </label>
        <label>
          <span className="field-label">Category</span>
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid-2">
        <label>
          <span className="field-label">Amount</span>
          <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label>
          <span className="field-label">Receipt</span>
          <Input value={receiptRequired ? "mock attached" : "optional mock"} disabled />
        </label>
      </div>
      <label>
        <span className="field-label">Description</span>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      {!valid ? <p className="form-error">Amount and category are required. Miscellaneous also needs a description.</p> : null}
      <Button
        variant="primary"
        disabled={!valid}
        onClick={() =>
          onSubmit({
            id: `EXP-${Date.now()}`,
            tripId: trip.id,
            category,
            amount: Number(amount),
            receiptPhotoUrl: "/mock/expense-receipt.jpg",
            description,
            timestamp: new Date().toISOString(),
            gpsLocation: { lat: 12.9716, lng: 77.5946 },
            status: "PENDING",
            rejectionReason: null,
          })
        }
      >
        Submit Expense
      </Button>
    </div>
  );
}
