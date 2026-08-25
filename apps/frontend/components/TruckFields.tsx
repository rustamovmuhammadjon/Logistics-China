export function TruckFields({
  truck,
}: {
  truck?: {
    plateNumber?: string | null;
    trailerPlateNumber?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    lengthM?: number | null;
    widthM?: number | null;
    heightM?: number | null;
    cargoWeight?: number | null;
    currentLocation?: string | null;
  };
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field name="plateNumber" label="Truck plate number" defaultValue={truck?.plateNumber} />
      <Field name="trailerPlateNumber" label="Trailer plate number" defaultValue={truck?.trailerPlateNumber} />
      <Field name="driverName" label="Driver name" defaultValue={truck?.driverName} />
      <Field name="driverPhone" label="Driver phone" defaultValue={truck?.driverPhone} />
      <Field name="lengthM" label="Length (m)" type="number" defaultValue={truck?.lengthM} />
      <Field name="widthM" label="Width (m)" type="number" defaultValue={truck?.widthM} />
      <Field name="heightM" label="Height (m)" type="number" defaultValue={truck?.heightM} />
      <Field name="cargoWeight" label="Cargo weight (kg)" type="number" defaultValue={truck?.cargoWeight} />
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
