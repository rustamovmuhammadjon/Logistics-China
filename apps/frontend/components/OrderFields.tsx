import { toDateInputValue } from "@logistics/shared";

type OrderLike = {
  name?: string;
  openedAt?: string | null;
  origin?: string | null;
  destination?: string | null;
  pol?: string | null;
  commodity?: string | null;
};

export function OrderFields({
  order,
  readOnly = false,
  polReadOnly = false,
}: {
  order?: OrderLike;
  readOnly?: boolean;
  polReadOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">Name (required)</label>
        <input
          className="field-input"
          type="text"
          name="name"
          defaultValue={order?.name ?? ""}
          required
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="field-label">Opened date</label>
        <input
          className="field-input"
          type="date"
          name="openedAt"
          defaultValue={toDateInputValue(order?.openedAt)}
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="field-label">Origin (from)</label>
        <input className="field-input" type="text" name="origin" defaultValue={order?.origin ?? ""} readOnly={readOnly} />
      </div>
      <div>
        <label className="field-label">Destination (to)</label>
        <input
          className="field-input"
          type="text"
          name="destination"
          defaultValue={order?.destination ?? ""}
          readOnly={readOnly}
        />
      </div>
      <div>
        <label className="field-label">POL (place of loading)</label>
        <input
          className="field-input"
          type="text"
          name="pol"
          defaultValue={order?.pol ?? ""}
          readOnly={readOnly || polReadOnly}
          placeholder={polReadOnly ? "Set by the operator" : undefined}
        />
      </div>
      <div>
        <label className="field-label">Commodity</label>
        <input
          className="field-input"
          type="text"
          name="commodity"
          defaultValue={order?.commodity ?? ""}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
