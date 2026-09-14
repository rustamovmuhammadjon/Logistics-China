export function TruckFields({
  truck,
}: {
  truck?: {
    plateNumber?: string | null;
    trailerPlateNumber?: string | null;
    country?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    cargoWeight?: number | null;
    currentLocation?: string | null;
  };
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field name="plateNumber" label="Truck plate number" defaultValue={truck?.plateNumber} />
      <Field name="trailerPlateNumber" label="Trailer plate number" defaultValue={truck?.trailerPlateNumber} />
      <Field name="country" label="Country" defaultValue={truck?.country} />
      <Field name="driverName" label="Driver name" defaultValue={truck?.driverName} />
      <Field name="driverPhone" label="Driver phone" defaultValue={truck?.driverPhone} />
      <Field name="cargoWeight" label="Gross weight (tons)" type="number" defaultValue={truck?.cargoWeight} />
      <div className="sm:col-span-3">
        <Field name="currentLocation" label="Current location" defaultValue={truck?.currentLocation} />
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type={type}
        step={type === "number" ? "0.01" : undefined}
        name={name}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}
