export type BikeDetails = {
  bike_number: string;
  chassis_number: string;
  year_made: string;
  model: string;
  log_category_id: string | null;
};

export type BikeServiceLog = {
  id: string;
  service_date: string;
  category_id: string | null;
  service_charge: number;
  parts_title: string;
  part_price: number;
  part_assemble_fee: number;
  logged_at?: string;
};

export type BikeUpgradeLog = {
  id: string;
  upgrade_date: string;
  category_id: string | null;
  title: string;
  part_price: number;
  part_assemble_fee: number;
  logged_at?: string;
};

export type BikeFuelLog = {
  id: string;
  filled_on: string;
  category_id: string | null;
  liters: number;
  amount: number;
  logged_at?: string;
};

export type VehicleLicenseState = {
  details: BikeDetails;
  service_logs: BikeServiceLog[];
  upgrade_logs: BikeUpgradeLog[];
  fuel_logs: BikeFuelLog[];
};
