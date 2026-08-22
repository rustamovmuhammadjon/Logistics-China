import { toDateInputValue } from "@logistics/shared";

type OrderLike = {
  name?: string;
  openedAt?: string | null;
  arrivedAt?: string | null;
  origin?: string | null;
  destination?: string | null;
  pol?: string | null;
  commodity?: string | null;
  volumeInfo?: string | null;
  factoryLoadDate?: string | null;
  statusText?: string | null;
};

export function OrderFields({
  order,
  includeStatus = false,
}: {
  order?: OrderLike;
  includeStatus?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">Name (required)</label>
        <input className="field-input" type="text" name="name" defaultValue={order?.name ?? ""} required />
      </div>
      <div>
        <label className="field-label">Opened date</label>
        <input className="field-input" type="date" name="openedAt" defaultValue={toDateInputValue(order?.openedAt)} />
      </div>
      <div>
        <label className="field-label">Origin (from)</label>
        <input className="field-input" type="text" name="origin" defaultValue={order?.origin ?? ""} />
      </div>
      <div>
        <label className="field-label">Destination (to)</label>
        <input className="field-input" type="text" name="destination" defaultValue={order?.destination ?? ""} />
      </div>
      <div>
        <label className="field-label">Arrived date</label>
        <input className="field-input" type="date" name="arrivedAt" defaultValue={toDateInputValue(order?.arrivedAt)} />
      </div>
      <div>
        <label className="field-label">POL (place of loading)</label>
        <input className="field-input" type="text" name="pol" defaultValue={order?.pol ?? ""} />
      </div>
      <div>
        <label className="field-label">Commodity</label>
        <input className="field-input" type="text" name="commodity" defaultValue={order?.commodity ?? ""} />
      </div>
      <div>
        <label className="field-label">Volume</label>
        <input
          className="field-input"
          type="text"
          name="volumeInfo"
          defaultValue={order?.volumeInfo ?? ""}
          placeholder="e.g. 8xFTL"
        />
      </div>
      <div>
        <label className="field-label">Factory load date</label>
        <input
          className="field-input"
          type="date"
          name="factoryLoadDate"
          defaultValue={toDateInputValue(order?.factoryLoadDate)}
        />
      </div>
      {includeStatus && (
        <div className="sm:col-span-2">
          <label className="field-label">Status / current location</label>
          <input className="field-input" type="text" name="statusText" defaultValue={order?.statusText ?? ""} />
        </div>
      )}
    </div>
  );
}
