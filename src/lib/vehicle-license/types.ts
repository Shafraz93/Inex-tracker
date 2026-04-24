export type BikeDetails = {
  bike_number: string;
  chassis_number: string;
  year_made: string;
  model: string;
};

export type BikeServiceLog = {
  id: string;
  service_date: string;
  service_charge: number;
  parts_title: string;
  parts_fee: number;
  logged_at?: string;
};

export type BikeUpgradeLog = {
  id: string;
  upgrade_date: string;
  title: string;
  fee: number;
  logged_at?: string;
};

export type BikeFuelLog = {
  id: string;
  filled_on: string;
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
