import { createContext, useContext } from "react";
import type { Tab } from "./components/TabBar";

export type Route =
  | { name: "trip"; tripId: string }
  | { name: "editProfile" }
  | { name: "editVehicle" }
  | { name: "attachTrip" };

export type Nav = {
  push: (route: Route) => void;
  pop: () => void;
  setTab: (tab: Tab) => void;
};

export const NavContext = createContext<Nav | null>(null);

export function useNav() {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav must be used inside MainScreen");
  return nav;
}
